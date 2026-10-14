import Joi from 'joi';
import { pool } from '../config/db.js';

const bookingSchema = Joi.object({
  facility_id: Joi.number().integer().required(),
  sport_id: Joi.number().integer().required(),
  time_slot_id: Joi.number().integer().required(),
  booking_date: Joi.date().required()
});

const select = `SELECT b.id,b.booking_code,b.booking_date,b.status,b.amount,b.created_at,
  s.name sport_name,f.name facility_name,
  DATE_FORMAT(ts.start_time,'%H:%i') start_time,
  DATE_FORMAT(ts.end_time,'%H:%i') end_time,
  u.full_name user_name,u.email user_email
  FROM bookings b
  JOIN sports s ON s.id=b.sport_id
  JOIN facilities f ON f.id=b.facility_id
  JOIN time_slots ts ON ts.id=b.time_slot_id
  JOIN users u ON u.id=b.user_id`;

export const listBookings = async (req, res, next) => {
  try {
    const q = req.query;
    let sql = select + ' WHERE 1=1';
    const p = [];

    if (req.user.role === 'USER') {
      sql += ' AND b.user_id=?'; p.push(req.user.id);
    } else if (q.userId) {
      sql += ' AND b.user_id=?'; p.push(q.userId);
    }

    for (const [key, col] of [['date','b.booking_date'],['sportId','b.sport_id'],['facilityId','b.facility_id'],['status','b.status']]) {
      if (q[key]) { sql += ` AND ${col}=?`; p.push(q[key]); }
    }

    if (q.search && req.user.role === 'ADMIN') {
      const term = `%${q.search}%`;
      sql += ' AND (b.booking_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
      p.push(term, term, term);
    }

    sql += ' ORDER BY b.booking_date DESC,ts.start_time DESC';
    const [rows] = await pool.query(sql, p);
    res.json(rows);
  } catch (e) { next(e); }
};

export async function createBooking(req, res, next) {
  const { error, value } = bookingSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const bookingDate = new Date(value.booking_date);
  if (Number.isNaN(bookingDate.getTime())) {
    return res.status(400).json({ message: 'Booking date is invalid.' });
  }
  const bookingDateIso = bookingDate.toISOString().slice(0,10);
  const todayIso = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if (bookingDateIso < todayIso) {
    return res.status(400).json({ message: 'Booking date must be today or a future date.' });
  }

  const c = await pool.getConnection();
  try {
    await c.beginTransaction();

    const [fr] = await c.query(
      'SELECT f.*,s.name sport_name FROM facilities f JOIN sports s ON s.id=f.sport_id WHERE f.id=? AND f.is_active=1 AND s.is_active=1 FOR UPDATE',
      [value.facility_id]
    );
    const f = fr[0];
    if (!f) {
      await c.rollback();
      return res.status(400).json({ message: 'Selected facility is unavailable.' });
    }
    if (Number(f.sport_id) !== Number(value.sport_id)) {
      await c.rollback();
      return res.status(400).json({ message: 'Sport and facility selection do not match.' });
    }

    const [sr] = await c.query(
      'SELECT * FROM time_slots WHERE id=? AND facility_id=? AND is_available=1 FOR UPDATE',
      [value.time_slot_id, value.facility_id]
    );
    if (!sr.length) {
      await c.rollback();
      return res.status(400).json({ message: 'Selected time slot is unavailable.' });
    }

    const [bl] = await c.query(
      'SELECT id FROM blocked_slots WHERE blocked_date=? AND time_slot_id=?',
      [bookingDateIso, value.time_slot_id]
    );
    if (bl.length) {
      await c.rollback();
      return res.status(409).json({ message: 'This slot is blocked for maintenance.' });
    }

    const [ex] = await c.query(
      "SELECT id FROM bookings WHERE facility_id=? AND booking_date=? AND time_slot_id=? AND status IN('PENDING','CONFIRMED') LIMIT 1",
      [value.facility_id, bookingDateIso, value.time_slot_id]
    );
    if (ex.length) {
      await c.rollback();
      return res.status(409).json({ message: 'That slot has already been booked.' });
    }

    const code = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*900+100)}`;
    const [r] = await c.query(
      "INSERT INTO bookings(booking_code,user_id,sport_id,facility_id,time_slot_id,booking_date,status,amount) VALUES(?,?,?,?,?,?,'CONFIRMED',?)",
      [code, req.user.id, value.sport_id, value.facility_id, value.time_slot_id, bookingDateIso, f.price]
    );

    await c.query(
      "INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,'BOOKING')",
      [req.user.id, 'Booking confirmed', `Your ${f.sport_name} booking ${code} is confirmed.`]
    );

    await c.commit();
    const [rows] = await pool.query(select + ' WHERE b.id=?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) {
    await c.rollback();
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'That slot has already been booked.' });
    next(e);
  } finally { c.release(); }
}

export const updateBooking = async (req, res, next) => {
  try {
    const allowed = ['PENDING','CONFIRMED','CANCELLED','COMPLETED'];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: 'Invalid booking status.' });
    const [r] = await pool.query('UPDATE bookings SET status=? WHERE id=?', [req.body.status, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Booking updated.' });
  } catch (e) { next(e); }
};
