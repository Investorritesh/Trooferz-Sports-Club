import bcrypt from 'bcryptjs';

export async function initMysqlSchema(conn) {
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS=0;');
    // 1. Create tables IF NOT EXISTS
    await conn.query(`
      CREATE TABLE IF NOT EXISTS roles(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(20) NOT NULL UNIQUE
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS users(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(120) NOT NULL,
        email VARCHAR(190) NOT NULL UNIQUE,
        mobile VARCHAR(30) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_role_active(role,is_active)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS sports(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        image_url VARCHAR(500),
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        duration_minutes INT UNSIGNED NOT NULL DEFAULT 60,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS facilities(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        sport_id INT UNSIGNED NOT NULL,
        capacity INT UNSIGNED NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        description TEXT,
        image_url VARCHAR(500),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_facilities_sport FOREIGN KEY(sport_id) REFERENCES sports(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        INDEX idx_facilities_sport_active(sport_id,is_active)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS time_slots(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        facility_id INT UNSIGNED NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY uq_facility_time(facility_id,start_time,end_time),
        CONSTRAINT fk_slots_facility FOREIGN KEY(facility_id) REFERENCES facilities(id) ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS blocked_slots(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        blocked_date DATE NOT NULL,
        time_slot_id INT UNSIGNED NOT NULL,
        reason VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_blocked_slot_date(blocked_date,time_slot_id),
        CONSTRAINT fk_blocked_slot FOREIGN KEY(time_slot_id) REFERENCES time_slots(id) ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_blocked_date(blocked_date)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS bookings(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        booking_code VARCHAR(40) NOT NULL UNIQUE,
        user_id INT UNSIGNED NOT NULL,
        sport_id INT UNSIGNED NOT NULL,
        facility_id INT UNSIGNED NOT NULL,
        time_slot_id INT UNSIGNED NOT NULL,
        booking_date DATE NOT NULL,
        status ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'PENDING',
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        active_slot_key VARCHAR(80) GENERATED ALWAYS AS (CASE WHEN status IN ('PENDING','CONFIRMED') THEN CONCAT(facility_id,'/',time_slot_id,'/',booking_date) ELSE NULL END) VIRTUAL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_booking_user FOREIGN KEY(user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_booking_sport FOREIGN KEY(sport_id) REFERENCES sports(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_booking_facility FOREIGN KEY(facility_id) REFERENCES facilities(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_booking_slot FOREIGN KEY(time_slot_id) REFERENCES time_slots(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        UNIQUE KEY uq_active_booking_slot(active_slot_key),
        INDEX idx_booking_date(booking_date),
        INDEX idx_booking_user(user_id),
        INDEX idx_booking_filters(sport_id,facility_id,status)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS membership_plans(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        price DECIMAL(10,2) NOT NULL,
        duration_days INT UNSIGNED NOT NULL,
        benefits TEXT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS memberships(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        plan_id INT UNSIGNED NOT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        status ENUM('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_membership_user FOREIGN KEY(user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        CONSTRAINT fk_membership_plan FOREIGN KEY(plan_id) REFERENCES membership_plans(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        INDEX idx_membership_status(status,end_date),
        INDEX idx_membership_user(user_id)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        title VARCHAR(150) NOT NULL,
        message VARCHAR(1000) NOT NULL,
        type ENUM('BOOKING','MEMBERSHIP','ANNOUNCEMENT','SYSTEM') NOT NULL DEFAULT 'SYSTEM',
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notification_user FOREIGN KEY(user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        INDEX idx_notification_user(user_id,is_read,created_at)
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS offers(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
        valid_until DATE NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS announcements(
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        message TEXT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_logs(
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        admin_user_id INT UNSIGNED NOT NULL,
        action VARCHAR(120) NOT NULL,
        entity_type VARCHAR(80),
        entity_id BIGINT UNSIGNED,
        details JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_admin_log_user FOREIGN KEY(admin_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        INDEX idx_admin_log_created(created_at)
      ) ENGINE=InnoDB;
    `);

    await conn.query('SET FOREIGN_KEY_CHECKS=1;');

    // 2. Check if seeding is needed
    const [rows] = await conn.query('SELECT COUNT(*) AS count FROM users');
    const userCount = rows[0]?.count || 0;

    if (userCount === 0) {
      console.log('[MYSQL_INIT] Seeding initial MySQL demo data...');

      await conn.query("INSERT IGNORE INTO roles(name) VALUES('USER'),('ADMIN')");

      const adminHash = bcrypt.hashSync('ChangeMe@123', 10);
      const userHash = bcrypt.hashSync('User@123', 10);

      await conn.query(`
        INSERT INTO users(full_name, email, mobile, password_hash, role, is_active) VALUES
        ('Trooferz Owner', 'admin@trooferz.demo', '9876543210', ?, 'ADMIN', 1),
        ('Aarav Kulkarni', 'user@trooferz.demo', '9876501234', ?, 'USER', 1),
        ('Sneha Patil', 'sneha@trooferz.demo', '9876505678', ?, 'USER', 1)
      `, [adminHash, userHash, userHash]);

      await conn.query(`
        INSERT INTO sports(name, description, image_url, price, duration_minutes, is_active) VALUES
        ('Football', 'Full-size turf football sessions for teams and casual groups.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80', 1200, 60, 1),
        ('Cricket', 'Weekend cricket nets and box-cricket sessions.', 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80', 900, 60, 1),
        ('Badminton', 'Indoor courts for singles and doubles.', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80', 500, 60, 1),
        ('Box Cricket', 'Fast-paced enclosed cricket for social and corporate games.', 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80', 1000, 60, 1),
        ('Basketball', 'Half-court basketball for practice and pickup games.', 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80', 800, 60, 1),
        ('Pickleball', 'Social and training pickleball sessions.', 'https://images.unsplash.com/photo-1610557892470-55c6d2a1458d?auto=format&fit=crop&w=1200&q=80', 600, 60, 1)
      `);

      await conn.query(`
        INSERT INTO facilities(name, sport_id, capacity, price, is_active, description, image_url) VALUES
        ('Arena 1 - Football Turf', 1, 14, 1200, 1, 'Premium outdoor turf with LED floodlights.', 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1200&q=80'),
        ('Arena 2 - Box Cricket', 4, 12, 1000, 1, 'Enclosed box-cricket arena with night lighting.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80'),
        ('Court 1 - Badminton', 3, 4, 500, 1, 'Indoor professional badminton court.', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'),
        ('Court 2 - Badminton', 3, 4, 500, 1, 'Indoor doubles court.', 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'),
        ('Half Court - Basketball', 5, 10, 800, 1, 'Floodlit half-court.', 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80'),
        ('Court 3 - Pickleball', 6, 4, 600, 1, 'Dedicated pickleball court.', 'https://images.unsplash.com/photo-1610557892470-55c6d2a1458d?auto=format&fit=crop&w=1200&q=80')
      `);

      await conn.query(`
        INSERT INTO time_slots(facility_id, start_time, end_time, is_available)
        SELECT f.id, MAKETIME(h.hour, 0, 0), MAKETIME(h.hour + 1, 0, 0), 1
        FROM facilities f
        CROSS JOIN (
          SELECT 6 AS hour UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
          UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
          UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21
        ) h
      `);

      await conn.query(`
        INSERT INTO membership_plans(name, price, duration_days, benefits, is_active) VALUES
        ('Starter Pass', 999, 30, '5% booking offer\\nPriority support\\n1 guest pass', 1),
        ('Club Pro', 2499, 90, '10% booking offer\\nPriority booking window\\n3 guest passes\\nFree court change once', 1),
        ('Elite Annual', 7999, 365, '15% booking offer\\nEarly slot access\\n12 guest passes\\nQuarterly coach clinic', 1)
      `);

      await conn.query(`
        INSERT INTO memberships(user_id, plan_id, start_date, end_date, status) VALUES
        (2, 2, NOW(), DATE_ADD(NOW(), INTERVAL 90 DAY), 'ACTIVE'),
        (3, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_ADD(NOW(), INTERVAL 10 DAY), 'ACTIVE')
      `);

      await conn.query(`
        INSERT INTO offers(title, description, discount_percent, valid_until, is_active) VALUES
        ('Monsoon Squad Deal', 'Book selected evening football slots as a group and save.', 12, DATE_ADD(CURDATE(), INTERVAL 20 DAY), 1),
        ('Weekday Badminton Boost', 'Demo offer on weekday daytime badminton.', 10, DATE_ADD(CURDATE(), INTERVAL 35 DAY), 1),
        ('Corporate League', 'Create a regular corporate slot block.', 15, DATE_ADD(CURDATE(), INTERVAL 45 DAY), 1)
      `);

      await conn.query(`
        INSERT INTO announcements(title, message, is_active) VALUES
        ('Welcome to Trooferz', 'Functional cloud-ready sports club backend system.', 1),
        ('Prime hours', 'Evening slots fill quickly. Check availability before confirming.', 1),
        ('Club launch week', 'Explore all facilities before choosing a plan.', 1)
      `);

      await conn.query(`
        INSERT INTO notifications(user_id, title, message, type, is_read) VALUES
        (2, 'Welcome to Trooferz', 'Your account is ready. Explore sports and book a time slot.', 'SYSTEM', 0),
        (2, 'Membership update', 'Your Club Pro membership is active.', 'MEMBERSHIP', 0),
        (3, 'Welcome to Trooferz', 'Your account is ready.', 'SYSTEM', 1)
      `);

      await conn.query(`
        INSERT IGNORE INTO bookings(booking_code, user_id, sport_id, facility_id, time_slot_id, booking_date, status, amount)
        SELECT 'TRF-DEMO-001', 2, 1, 1, ts.id, DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'CONFIRMED', 1200
        FROM time_slots ts WHERE ts.facility_id = 1 AND ts.start_time = '18:00:00' LIMIT 1
      `);

      console.log('[MYSQL_INIT] Seed data successfully inserted into MySQL.');
    } else {
      console.log('[MYSQL_INIT] MySQL tables already exist and contain data. Skipping seed.');
    }
  } catch (err) {
    console.error('[MYSQL_INIT_ERROR] Failed during MySQL database initialization:', err.message);
    throw err;
  }
}
