import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {pool} from '../config/db.js';
export async function requireAuth(req,res,next){try{const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({message:'Authentication required.'});const p=jwt.verify(t,env.jwtSecret);const [rows]=await pool.query('SELECT id,full_name,email,mobile,role,is_active FROM users WHERE id=?',[p.id]);const u=rows[0];if(!u||!u.is_active)return res.status(401).json({message:'Account is inactive or unavailable.'});req.user=u;next()}catch{return res.status(401).json({message:'Invalid or expired authentication token.'})}}
export const requireRole=(...roles)=>(req,res,next)=>{if(!req.user||!roles.includes(req.user.role))return res.status(403).json({message:'You do not have permission to access this resource.'});next()};
