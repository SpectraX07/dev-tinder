import Razorpay from 'razorpay';
import serverConfig from '../core/server.js';

var razorpayInstance = new Razorpay({
  key_id: serverConfig.razorpay.key,
  key_secret: serverConfig.razorpay.secret,
});

export default razorpayInstance;
