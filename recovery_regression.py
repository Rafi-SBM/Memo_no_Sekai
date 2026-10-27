from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://127.0.0.1:3018", wait_until="networkidle")
    page.get_by_text("Ideas for the studio", exact=True).click()
    page.get_by_role("button", name="Protect").click()
    page.locator('input[placeholder="Password (4+ characters)"]').fill("memo-password")
    page.get_by_role("button", name="Continue").click()
    page.get_by_role("heading", name="Your recovery code").wait_for()
    code = page.locator(".recovery-code").text_content().strip()
    assert len(code) == 14 and code.count("-") == 2, code
    page.get_by_role("button", name="I saved it").click()
    page.get_by_role("button", name="Close editor").click()
    page.get_by_text("Ideas for the studio", exact=True).click()
    page.get_by_role("button", name="Protected").click()
    page.get_by_role("button", name="Forgot password? Use recovery code").click()
    page.get_by_role("heading", name="Recover this memo").wait_for()
    page.locator('input[placeholder="XXXX-XXXX-XXXX"]').fill(code)
    page.get_by_role("button", name="Recover memo").click()
    page.get_by_role("button", name="Close editor").click()
    payload = page.evaluate("""async () => (await fetch('/api/notes')).json()""")
    recovered = next(note for note in payload["notes"] if note["title"] == "Ideas for the studio")
    expected = "A small library of beautiful, useful things.\\n\\nMaybe the best products feel like places rather than tools."
    assert not recovered["protected"] and recovered["content"] == expected, recovered
    assert len(payload["notes"]) == 5
    print({"recovery_code_shape": code, "recovered": True, "note_count": len(payload["notes"])})
    browser.close()
