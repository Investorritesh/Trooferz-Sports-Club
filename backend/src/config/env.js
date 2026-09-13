import dotenv from 'dotenv';
dotenv.config();
if(!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required in backend/.env');
const corsOrigins=(process.env.CORS_ORIGIN||'http://localhost:5173,http://127.0.0.1:5173').split(',').map(x=>x.trim()).filter(Boolean);
export const env={port:Number(process.env.PORT||5000),db:{host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER||'root',password:process.env.DB_PASSWORD||'',name:process.env.DB_NAME||'trooferz_sports_club'},jwtSecret:process.env.JWT_SECRET,jwtExpiresIn:process.env.JWT_EXPIRES_IN||'2h',corsOrigins};
