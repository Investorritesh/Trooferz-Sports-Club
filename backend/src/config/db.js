import mysql from 'mysql2/promise';
import {env} from './env.js';
export const pool=mysql.createPool({host:env.db.host,port:env.db.port,user:env.db.user,password:env.db.password,database:env.db.name,waitForConnections:true,connectionLimit:10,decimalNumbers:true,dateStrings:true});
export async function pingDb(){const c=await pool.getConnection();await c.ping();c.release()}
