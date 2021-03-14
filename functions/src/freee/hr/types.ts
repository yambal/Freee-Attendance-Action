export type TimeClockType = "clock_in" | "break_begin" | "break_end" | "clock_out"
export type ErrorCode = "UnLinked"

export type FreeeApiError = {
  errorMessage: string
  message: string
  code?: ErrorCode
}

export type EmployeeTimeClock = {
  id: number
  date: string
  type: string
  datetime: string
  original_datetime: string
  note: string
}

export type WorkRecordSummaries = {
  year: number
  month: number
  start_date: string
  end_date: string
  work_days: number
  total_work_mins: number
  total_normal_work_mins: number
  total_excess_statutory_work_mins: number
  total_overtime_except_normal_work_mins: number
  total_overtime_within_normal_work_mins: number
  total_holiday_work_mins: number
  total_latenight_work_mins: number
  num_absences: number
  num_paid_holidays: number
  num_paid_holidays_and_hours: {
    days: number
    hours: number
  }
  num_paid_holidays_left: number
  num_paid_holidays_and_hours_left: {
    days: number
    hours: number
  }
  num_substitute_holidays_used: number
  num_compensatory_holidays_used: number
  num_special_holidays_used: number
  num_special_holidays_and_hours_used: {
    days: number
    hours: number
  },
  total_lateness_and_early_leaving_mins: number
  work_records: any[]
}