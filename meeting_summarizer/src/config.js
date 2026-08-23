// Local backend configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:4000',

  ENDPOINTS: {
    UPLOAD_VIDEO: '/upload-video',
    GET_SUMMARY: '/get-summary'
  },

  TIMEOUT: 30000,

  POLLING: {
    INTERVAL: 5000,
    MAX_ATTEMPTS: 60,
    TIMEOUT: 300000
  },

  UPLOAD: {
    MAX_FILE_SIZE: 500 * 1024 * 1024,
    ALLOWED_TYPES: [
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv'
    ]
  }
}

export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json'
})

export const getUploadHeaders = () => ({
  'Accept': 'application/json'
})
