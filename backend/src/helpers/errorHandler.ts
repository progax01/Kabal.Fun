export class ErrorHandlerType extends Error{
  statusCode:number
  constructor(statusCode: number,message:string){
    super(message);
    this.statusCode = statusCode;
  }
}

const errorHandler = (statusCode:number, message:string) => {
  const error = new ErrorHandlerType(statusCode,message);
  error.statusCode = statusCode;
  error.message = message;
  return error;
};
export default errorHandler;
