import { auth } from "./auth";
import router from "./router";
import { handleRazorpayWebhook } from "./razorpay";

const http = router;

auth.addHttpRoutes(http);

http.route({
  path: "/razorpay",
  method: "POST",
  handler: handleRazorpayWebhook,
});

export default http;
