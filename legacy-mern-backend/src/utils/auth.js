import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
export const signToken=user=>jwt.sign({id:user.id,role:user.role,email:user.email},env.jwtSecret,{expiresIn:env.jwtExpiresIn});
