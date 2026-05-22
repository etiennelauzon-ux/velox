declare module 'express-rate-limit' {
  interface Options { [key: string]: any }
  function rateLimit(opts?: Options): any;
  export default rateLimit;
}
