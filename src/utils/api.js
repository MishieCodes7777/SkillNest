export async function api(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}`, ...options.headers } });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Something went wrong. Please try again.');
    return data;
}
