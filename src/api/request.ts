const headers = {
  'Content-Type': 'application/json',
}

export function fetchPost(url: string, options: RequestInit = {}) {
  return fetch(url, {
    method: 'post',
    headers,
    ...options
  })
    .then(response => response.json())
    .then(data => data);
}