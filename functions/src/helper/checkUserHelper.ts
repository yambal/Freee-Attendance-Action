import * as functions from "firebase-functions";
import * as freee from "freee-api-client"

export const checkUserHelper = (conv: any) => {
  return new Promise((resolve: (user: freee.HrUser) => void, reject: (error: freee.ApiClientError) => void) => {

    /**
     * セッションにユーザー情報があれば利用する
     */
    if (conv.session.params.free_user) {
      functions.logger.log("use: conv.session.params.free_user")
      resolve(conv.session.params.free_user)
      return
    }

    /**
     * 
     */
    const {user: {accountLinkingStatus, verificationStatus, params}} = conv
    const {bearerToken} = params

    if(verificationStatus === "VERIFIED" && accountLinkingStatus === "LINKED" && bearerToken){
      freee.hr.user.getMe(bearerToken)
      .then((user) => {
        conv.session.params.free_user = user
        functions.logger.log("set: conv.session.params.free_user")
        resolve(user)
      })
      .catch((error) => {
        resolve(error)
      })
    } else {
      if (verificationStatus !== "VERIFIED") {
        // デバイスがユーザーを認識できていない
        const error: freee.ApiClientError = {
          statusCode: undefined,
          statusMessage: undefined,
          axiosMessage: undefined,
          apiMessage: undefined,
          errorApi: undefined,
          uri: undefined,
          method: undefined,
          extends: {
            type: "verified"
          }
        }
        reject(error)
      } else if(accountLinkingStatus !== "LINKED") {
        // AcountLinking が完了していない
        const error: freee.ApiClientError = {
          statusCode: undefined,
          statusMessage: undefined,
          axiosMessage: undefined,
          apiMessage: undefined,
          errorApi: undefined,
          uri: undefined,
          method: undefined,
          extends: {
            type: "acount linking"
          }
        }
        reject(error)
      } else if(!bearerToken){
        // トークンが無い
        const error: freee.ApiClientError = {
          statusCode: undefined,
          statusMessage: undefined,
          axiosMessage: undefined,
          apiMessage: undefined,
          errorApi: undefined,
          uri: undefined,
          method: undefined,
          extends: {
            type: "token"
          }
        }
        reject(error)
      } else {
        // ?
        const error: freee.ApiClientError = {
          statusCode: undefined,
          statusMessage: undefined,
          axiosMessage: undefined,
          apiMessage: undefined,
          errorApi: undefined,
          uri: undefined,
          method: undefined,
          extends: {
            type: "unknown"
          }
        }
        reject(error)
      }
    }
  })
}