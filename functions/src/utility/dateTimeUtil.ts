/**
 * https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat/formatToParts
 * 
 */

type PartsObj = {
  day?: string
  dayPeriod?: string
  era?: string
  fractionalSecond?: string
  hour?: string
  literal?: string
  minute?: string
  month?: string
  relatedYear?: string
  second?: string
  timeZoneName?: string
  weekday?: string
  year?: string
  yearName?: string
}

export const getParts = (locale: string):Intl.DateTimeFormatPart[] => {
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    hour12: false
  })
  return  formatter.formatToParts(new Date)
}

export const getPartsObj = (locale: string): PartsObj => {
  const parts = getParts(locale)
  const ret: PartsObj = {}
  parts.forEach((part) => {
    ret[part.type] = part.value 
  })
  return ret
}

export const greeting = (locale: string): number => {
  const partObj = getPartsObj(locale)
  if(partObj.hour){
    const hour = parseInt(partObj.hour, 10)
    return hour
  }
  return NaN
}