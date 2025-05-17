import { Request } from 'express';
import { IUserDocument } from './userTypes';
import { IFundDocument } from './fundTypes';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      fund?: IFundDocument;
    }
  }
} 