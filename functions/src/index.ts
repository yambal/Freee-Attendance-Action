/**
 * https://developers.google.com/assistant/conversational/fulfillment-migration
 * https://developers.google.com/assistant/conversational/conditions
 * https://developers.google.com/assistant/conversational/webhooks#node.js_3
 * https://developers.google.com/assistant/conversational/storage
 * https://developers.google.com/assistant/conversational/storage-session
 */
import {conversation} from "@assistant/conversation";
import * as functions from "firebase-functions";
import {Me} from "./freee/hr/users/me"

const app = conversation({debug: true});

app.handle("linked", async (conv: any) => {
  functions.logger.info("conv.user", conv.user)

  return Me(conv.user.params.bearerToken)
  .then((user) => {
    functions.logger.info("success", user)
    const company = user.companies[0]
    const ssml = `<speak>${company.name}の${company.display_name}</speak>`;
    conv.session.params["name"] = company.display_name
    conv.add(ssml);
  })
  .catch((error) => {
    functions.logger.info("error", error)
    const ssml = "<speak>どうかな</speak>";
    conv.add(ssml);
  })
});

app.handle("UserName", async (conv: any) => {
  const name = conv.session.params["name"];
  const ssml = `<speak>${name}</speak>`;
  conv.add(ssml);
})

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
