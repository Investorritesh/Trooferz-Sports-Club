USE trooferz_sports_club;
-- Demo passwords: admin ChangeMe@123, user User@123
INSERT INTO users(full_name,email,mobile,password_hash,role,is_active) VALUES
('Trooferz Owner','admin@trooferz.demo','9876543210','$2a$10$A.1ww.yeNkcgFCT7uvak/eFOIjl5IV44r825U3BSQerkwp2nzCqTa','ADMIN',1),
('Aarav Kulkarni','user@trooferz.demo','9876501234','$2a$10$zp.bi27qwVSdMBF3XA1HLOrEnBj8fexohxLvJoLbpfdOWt8QkTh2q','USER',1),
('Sneha Patil','sneha@trooferz.demo','9876505678','$2a$10$zp.bi27qwVSdMBF3XA1HLOrEnBj8fexohxLvJoLbpfdOWt8QkTh2q','USER',1);
INSERT INTO sports(name,description,image_url,price,duration_minutes,is_active) VALUES
('Football','Full-size turf football sessions for teams and casual groups.','https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80',1200,60,1),
('Cricket','Weekend cricket nets and box-cricket sessions.','https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',900,60,1),
('Badminton','Indoor courts for singles and doubles.','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80',500,60,1),
('Box Cricket','Fast-paced enclosed cricket for social and corporate games.','https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80',1000,60,1),
('Basketball','Half-court basketball for practice and pickup games.','https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80',800,60,1),
('Pickleball','Social and training pickleball sessions.','https://images.unsplash.com/photo-1610557892470-55c6d2a1458d?auto=format&fit=crop&w=1200&q=80',600,60,1);
INSERT INTO facilities(name,sport_id,capacity,price,is_active,description,image_url) VALUES
('Arena 1 - Football Turf',1,14,1200,1,'Premium outdoor turf with LED floodlights.','https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&w=1200&q=80'),
('Arena 2 - Box Cricket',4,12,1000,1,'Enclosed box-cricket arena with night lighting.','https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80'),
('Court 1 - Badminton',3,4,500,1,'Indoor professional badminton court.','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'),
('Court 2 - Badminton',3,4,500,1,'Indoor doubles court.','https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80'),
('Half Court - Basketball',5,10,800,1,'Floodlit half-court.','https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80'),
('Court 3 - Pickleball',6,4,600,1,'Dedicated pickleball court.','https://images.unsplash.com/photo-1610557892470-55c6d2a1458d?auto=format&fit=crop&w=1200&q=80');
INSERT INTO time_slots(facility_id,start_time,end_time,is_available)
SELECT f.id,MAKETIME(h.hour,0,0),MAKETIME(h.hour+1,0,0),1 FROM facilities f CROSS JOIN (SELECT 6 hour UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20 UNION ALL SELECT 21) h;
INSERT INTO membership_plans(name,price,duration_days,benefits,is_active) VALUES
('Starter Pass',999,30,'5% booking offer\nPriority support\n1 guest pass',1),
('Club Pro',2499,90,'10% booking offer\nPriority booking window\n3 guest passes\nFree court change once',1),
('Elite Annual',7999,365,'15% booking offer\nEarly slot access\n12 guest passes\nQuarterly coach clinic',1);
INSERT INTO memberships(user_id,plan_id,start_date,end_date,status) VALUES(2,2,NOW(),DATE_ADD(NOW(),INTERVAL 90 DAY),'ACTIVE'),(3,1,DATE_SUB(NOW(),INTERVAL 20 DAY),DATE_ADD(NOW(),INTERVAL 10 DAY),'ACTIVE');
INSERT INTO offers(title,description,discount_percent,valid_until,is_active) VALUES('Monsoon Squad Deal','Book selected evening football slots as a group and save.',12,DATE_ADD(CURDATE(),INTERVAL 20 DAY),1),('Weekday Badminton Boost','Demo offer on weekday daytime badminton.',10,DATE_ADD(CURDATE(),INTERVAL 35 DAY),1),('Corporate League','Create a regular corporate slot block.',15,DATE_ADD(CURDATE(),INTERVAL 45 DAY),1);
INSERT INTO announcements(title,message,is_active) VALUES('Welcome to Trooferz','Functional local-development demo. Seed records are fictional.',1),('Prime hours','Evening slots fill quickly. Check availability before confirming.',1),('Club launch week','Explore all facilities before choosing a plan.',1);
INSERT INTO notifications(user_id,title,message,type,is_read) VALUES(2,'Welcome to Trooferz','Your demo account is ready. Explore sports and book a time slot.','SYSTEM',0),(2,'Membership update','Your Club Pro membership is active in the demo environment.','MEMBERSHIP',0),(3,'Welcome to Trooferz','Your demo account is ready.','SYSTEM',1);

INSERT INTO bookings(booking_code,user_id,sport_id,facility_id,time_slot_id,booking_date,status,amount)
SELECT 'TRF-DEMO-001',2,1,1,ts.id,DATE_ADD(CURDATE(),INTERVAL 1 DAY),'CONFIRMED',1200 FROM time_slots ts WHERE ts.facility_id=1 AND ts.start_time='18:00:00' LIMIT 1;
INSERT INTO bookings(booking_code,user_id,sport_id,facility_id,time_slot_id,booking_date,status,amount)
SELECT 'TRF-DEMO-002',3,3,3,ts.id,DATE_ADD(CURDATE(),INTERVAL 2 DAY),'COMPLETED',500 FROM time_slots ts WHERE ts.facility_id=3 AND ts.start_time='07:00:00' LIMIT 1;
INSERT INTO bookings(booking_code,user_id,sport_id,facility_id,time_slot_id,booking_date,status,amount)
SELECT 'TRF-DEMO-003',2,4,2,ts.id,DATE_ADD(CURDATE(),INTERVAL 3 DAY),'CONFIRMED',1000 FROM time_slots ts WHERE ts.facility_id=2 AND ts.start_time='20:00:00' LIMIT 1;
