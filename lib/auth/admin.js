const ADMIN_EMAILS = ['niroulamilan37@gmail.com']

export function isAdmin(email) {
    return ADMIN_EMAILS.includes(email?.toLowerCase())
}
