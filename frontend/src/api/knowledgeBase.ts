import client from './client'
import { PaginatedResponse } from './tickets'

export interface KnowledgeArticle {
  id: number
  title: string
  content?: string
  content_html?: string | null
  category: string
  language: string
  tags?: string[]
  error_codes?: string[]
  station_models?: string[]
  is_published: boolean
  is_featured?: boolean
  view_count: number
  helpful_count?: number
  not_helpful_count?: number
  author_id?: number
  author?: {
    id: number
    first_name: string
    last_name: string
  }
  last_editor_id?: number | null
  published_at?: string | null
  created_at: string
  updated_at: string
}

export interface ArticleListParams {
  page?: number
  per_page?: number
  search?: string
  category?: string
  language?: string
  is_published?: boolean
  tags?: string[]
}

export interface CreateArticleData {
  title: string
  content: string
  category: string
  language?: string
  tags?: string[]
  error_codes?: string[]
  station_models?: string[]
  is_published?: boolean
  is_featured?: boolean
}

export interface SearchResult {
  article: KnowledgeArticle
  score: number
  snippet: string
}

interface KnowledgeSearchResponse {
  results: Array<{
    article_id: number
    title: string
    category: string
    content_preview: string
    score: number
  }>
  query: string
}

export const knowledgeBaseApi = {
  list: async (params?: ArticleListParams): Promise<PaginatedResponse<KnowledgeArticle>> => {
    const response = await client.get<PaginatedResponse<KnowledgeArticle>>('/knowledge', { params })
    return response.data
  },

  get: async (id: number): Promise<KnowledgeArticle> => {
    const response = await client.get<KnowledgeArticle>(`/knowledge/${id}`)
    return response.data
  },

  create: async (data: CreateArticleData): Promise<KnowledgeArticle> => {
    const response = await client.post<KnowledgeArticle>('/knowledge', data)
    return response.data
  },

  update: async (id: number, data: Partial<CreateArticleData>): Promise<KnowledgeArticle> => {
    const response = await client.put<KnowledgeArticle>(`/knowledge/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/knowledge/${id}`)
  },

  search: async (query: string, limit?: number, category?: string, tags?: string[], language?: string): Promise<SearchResult[]> => {
    const response = await client.post<KnowledgeSearchResponse>('/knowledge/search', {
      query,
      limit: limit || 50,
      category,
      tags,
      language,
    })

    return response.data.results.map((result) => ({
      article: {
        id: result.article_id,
        title: result.title,
        category: result.category,
        language: language || 'uk',
        content: result.content_preview,
        tags,
        is_published: true,
        view_count: 0,
        created_at: '',
        updated_at: '',
      },
      score: result.score,
      snippet: result.content_preview,
    }))
  },

  markHelpful: async (id: number, helpful: boolean): Promise<void> => {
    await client.post(`/knowledge/${id}/helpful`, { helpful })
  },

  getCategories: async (): Promise<string[]> => {
    const response = await client.get<string[]>('/knowledge/categories')
    return response.data
  },
}
