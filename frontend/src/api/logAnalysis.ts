import client from './client'

export interface LogAnalysisRequest {
  log_content: string
  language?: string
}

export interface LogAnalysisResponse {
  analysis: string
  error_codes: string[]
  status: string
  recommendations: string[]
}

export const logAnalysisApi = {
  analyze: async (request: LogAnalysisRequest): Promise<LogAnalysisResponse> => {
    const response = await client.post<LogAnalysisResponse>('/log-analysis/analyze', request)
    return response.data
  },
}
