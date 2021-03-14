import * as functions from "firebase-functions";

type PartsObj = {
  day: string
  dayPeriod: string
  era: string
  fractionalSecond: string
  hour: string
  literal: string
  minute: string
  month: string
  relatedYear: string
  second: string
  timeZoneName: string
  weekday: string
  year: string
  yearName: string
}

const getParts = (locale: string, date: Date):Intl.DateTimeFormatPart[] => {
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo"
  })
  return  formatter.formatToParts(date)
}

const getPartsObj = (locale: string, date: Date): PartsObj => {
  const parts = getParts(locale, date)
  functions.logger.info("parts", parts)

  const tmp: any = {}
  parts.forEach((part) => {
    tmp[part.type] = part.value 
  })

  functions.logger.info("tmp", tmp)
  const ret: PartsObj = tmp
  return ret
}

export const getDateString = (locale: string, date: Date): string => {
  const partsObj = getPartsObj(locale, date)
  return `${partsObj.year}-${partsObj.month}-${partsObj.day}`
}

export const getDateTimeString = (locale: string, date: Date): string => {
  const partsObj = getPartsObj(locale, date)
  return `${partsObj.year}-${partsObj.month}-${partsObj.day} ${partsObj.hour}:${partsObj.minute}:${partsObj.second}`
}

export const getYear = (locale: string, date: Date): string => {
  const partsObj = getPartsObj(locale, date)
  return partsObj.year
}

export const getMonth = (locale: string, date: Date): string => {
  const partsObj = getPartsObj(locale, date)
  return partsObj.month
}

