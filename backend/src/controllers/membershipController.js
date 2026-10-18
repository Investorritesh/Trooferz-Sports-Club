import Joi from 'joi';import {pool} from '../config/db.js';
export const plans=async(req,res,next)=>{try{const [rows]=await pool.query('SELECT * FROM membership_plans WHERE is_active=1 ORDER BY price');res.json(rows)}catch(e){next(e)}};
export const adminPlans=async(req,res,next)=>{try{const [rows]=await pool.query('SELECT * FROM membership_plans ORDER BY price');res.json(rows)}catch(e){next(e)}};
export const myMemberships = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT m.*, mp.name plan_name, mp.benefits, mp.price FROM memberships m JOIN membership_plans mp ON mp.id=m.plan_id WHERE m.user_id=? ORDER BY m.end_date DESC',
      [req.user.id]
    );
    res.json(rows.map(m => ({ ...m, is_frozen: m.status === 'FROZEN' })));
  } catch (e) {
    next(e);
  }
};

export const adminMemberships = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT m.*, u.full_name user_name, u.email, mp.name plan_name, mp.price FROM memberships m JOIN users u ON u.id=m.user_id JOIN membership_plans mp ON mp.id=m.plan_id ORDER BY m.end_date DESC'
    );
    res.json(rows.map(m => ({ ...m, is_frozen: m.status === 'FROZEN' })));
  } catch (e) {
    next(e);
  }
};

export const activateMembership = async (req, res, next) => {
  try {
    const planId = req.body.planId || req.body.plan_id;
    const paymentMethod = req.body.payment_method || req.body.paymentMethod || 'DIRECT';
    const [r] = await pool.query('SELECT * FROM membership_plans WHERE id=? AND is_active=1', [planId]);
    const p = r[0];
    if (!p) return res.status(404).json({ message: 'Membership plan not found.' });

    const start = new Date(), end = new Date(start);
    end.setDate(end.getDate() + Number(p.duration_days));
    const fmt = d => d.toISOString().slice(0, 19).replace('T', ' ');

    await pool.query(
      "INSERT INTO memberships(user_id,plan_id,start_date,end_date,status) VALUES(?,?,?,?,'ACTIVE')",
      [req.user.id, p.id, fmt(start), fmt(end)]
    );

    await pool.query(
      "INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,'MEMBERSHIP')",
      [req.user.id, 'Membership activated', `Your ${p.name} membership is active via ${paymentMethod} payment.`]
    );

    res.status(201).json({
      message: `🎉 Welcome to ${p.name}! Membership activated successfully.`,
      status: 'ACTIVE'
    });
  } catch (e) {
    next(e);
  }
};

export const freezeMembership = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT id FROM memberships WHERE user_id=? AND status='ACTIVE' ORDER BY end_date DESC LIMIT 1", [req.user.id]);
    if (!rows.length) return res.status(400).json({ message: 'No active membership to freeze.' });
    await pool.query("UPDATE memberships SET status='FROZEN' WHERE id=?", [rows[0].id]);
    res.json({ message: 'Membership frozen. Validity paused.' });
  } catch (e) { next(e); }
};

export const unfreezeMembership = async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT id FROM memberships WHERE user_id=? AND status='FROZEN' ORDER BY end_date DESC LIMIT 1", [req.user.id]);
    if (!rows.length) return res.status(400).json({ message: 'No frozen membership to unfreeze.' });
    await pool.query("UPDATE memberships SET status='ACTIVE' WHERE id=?", [rows[0].id]);
    res.json({ message: 'Membership unpaused and active!' });
  } catch (e) { next(e); }
};
const planSchema=Joi.object({name:Joi.string().min(2).max(120).required(),price:Joi.number().min(0).required(),duration_days:Joi.number().integer().min(1).max(3650).required(),benefits:Joi.string().allow('').required(),is_active:Joi.boolean().default(true)});
export const createPlan=async(req,res,next)=>{try{const {error,value}=planSchema.validate(req.body);if(error)return res.status(400).json({message:error.details[0].message});const [r]=await pool.query('INSERT INTO membership_plans(name,price,duration_days,benefits,is_active) VALUES(?,?,?,?,?)',[value.name,value.price,value.duration_days,value.benefits,value.is_active?1:0]);const [rows]=await pool.query('SELECT * FROM membership_plans WHERE id=?',[r.insertId]);res.status(201).json(rows[0])}catch(e){next(e)}};
export const updatePlan=async(req,res,next)=>{try{const {error,value}=planSchema.validate(req.body);if(error)return res.status(400).json({message:error.details[0].message});await pool.query('UPDATE membership_plans SET name=?,price=?,duration_days=?,benefits=?,is_active=? WHERE id=?',[value.name,value.price,value.duration_days,value.benefits,value.is_active?1:0,req.params.id]);const [rows]=await pool.query('SELECT * FROM membership_plans WHERE id=?',[req.params.id]);if(!rows.length)return res.status(404).json({message:'Plan not found.'});res.json(rows[0])}catch(e){next(e)}};
