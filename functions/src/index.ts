/**
 * https://developers.google.com/assistant/conversational/fulfillment-migration
 * https://developers.google.com/assistant/conversational/conditions
 * https://developers.google.com/assistant/conversational/webhooks#node.js_3
 * https://developers.google.com/assistant/conversational/storage
 * https://developers.google.com/assistant/conversational/storage-session
 */
import {conversation, Suggestion} from "@assistant/conversation";
import * as functions from "firebase-functions";
import {Me} from "./freee/hr/users/me"
import {availableTypes, AvailableTypes} from "./freee/hr/employees/timeClocks/availableTypes"
import { FreeeApiError } from "./freee/hr/hrRequst";

const app = conversation({debug: false});

app.handle("CheckToken", async (conv: any) => {

  functions.logger.info("device.capabilities", conv.device.capabilities)
  functions.logger.info("conv.user", conv.user)
  functions.logger.info("date", new Date())

  if(conv.user.params.bearerToken){
    return Me(conv.user.params.bearerToken)
    .then((user) => {
      functions.logger.info("success", user)
      const company = user.companies[0]
      conv.session.params.name = company.display_name
      conv.session.params.company = company
      conv.scene.next.name = "LinkedUser";
    })
    .catch((error) => {
      functions.logger.info("error", error)
      const ssml = "<speak>どうかな</speak>";
      conv.add(ssml);
    })
    
  }else{
    conv.session.params.name = null
    conv.scene.next.name = "UnLinkedUser";
  } 
})

app.handle("LinkedUser", async (conv: any) => {
  const {name, company: {name : comName, id: comId, employee_id: empId}} = conv.session.params
  const {bearerToken} = conv.user.params

  conv.add(`<speak>${comName}の${name}</speak>`);

  // 打刻可能種別の取得
  return availableTypes(bearerToken, comId, empId)
  .then((data: AvailableTypes) => {
    functions.logger.info("data", data)
    const types: string[] = data.available_types.map((type) => {
      switch (type) {
        case "clock_in":
          return "出勤"
        case "break_begin":
          return "休憩開始"
        case "break_end":
          return "休憩終了"
        case "clock_out":
          return "退勤"  
      }
    })

    types.forEach((type) => {
      conv.add(new Suggestion({title: type}))
    })
  })
  .catch((error: FreeeApiError) => {
    conv.add(`<speak>${error.message}</speak>`);
  })
});

app.handle("UserName", async (conv: any) => {
  const name = conv.session.params["name"];
  const ssml = `<speak>${name}</speak>`;
  conv.add(ssml);
})

exports.ActionsOnGoogleFulfillment = functions.https.onRequest(app);
