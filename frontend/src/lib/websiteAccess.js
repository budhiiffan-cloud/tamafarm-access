const KEY = 'tamafarm_website_password'
let memoryPassword = ''

export function getWebsitePassword() {
  try {
    return sessionStorage.getItem(KEY) || memoryPassword
  } catch {
    return memoryPassword
  }
}

export function setWebsitePassword(password) {
  memoryPassword = password
  try {
    if (password) sessionStorage.setItem(KEY, password)
    else sessionStorage.removeItem(KEY)
  } catch {
    // Access remains available for this page when browser storage is disabled.
  }
}
