import * as hr from "../freeApi/hr";
import {FreeeApiError, HrUser} from "../freeApi/hr/hrTypes"
import * as functions from "firebase-functions";

export const checkUserHelper = (conv: any) => {
  return new Promise((resolve: (user: HrUser) => void, reject: (error: FreeeApiError) => void) => {

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
      hr.user.me(bearerToken)
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
        const error: FreeeApiError = {
          errorMessage: "verificationStatus error",
          message: "ユーザーを認識できません"
        }
        reject(error)
      } else if(accountLinkingStatus !== "LINKED") {
        // AcountLinking が完了していない
        const error: FreeeApiError = {
          errorMessage: "accountLinkingStatus error",
          message: "freee との連携設定が行われていません",
          code: "UnLinked"
        }
        reject(error)
      } else if(!bearerToken){
        // トークンが無い
        const error: FreeeApiError = {
          errorMessage: "token error",
          message: "認証情報がありません"
        }
        reject(error)
      } else {
        // ?
        const error: FreeeApiError = {
          errorMessage: "unknown error",
          message: "エラー"
        }
        reject(error)
      }
    }
  })
}