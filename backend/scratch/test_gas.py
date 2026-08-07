import requests

url = "https://script.google.com/macros/s/AKfycbzIf0r1kjvxhEgSvvMTAJUsEsrd5ILIBewP4YwE4GaWzV0wg9SkjZGLhk9HWfG5ci8WBQ/exec"
payload = {
    "recipient": "test@example.com",
    "subject": "Test",
    "htmlBody": "<h1>Test</h1>",
    "attachments": []
}

try:
    response = requests.post(url, json=payload, allow_redirects=True)
    print("Status:", response.status_code)
    print("History:", response.history)
    print("Text:", response.text[:200])
except Exception as e:
    print("Error:", e)
