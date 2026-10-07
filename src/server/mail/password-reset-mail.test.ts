import { describe, expect, it } from "vitest";
import { passwordResetMail } from "@/server/mail/password-reset-mail";

describe("passwordResetMail", () => {
  it("본문과 HTML 에 링크를 싣는다", () => {
    const m = passwordResetMail("a@b.c", "https://x.test/reset-password?token=abc");
    expect(m.to).toBe("a@b.c");
    expect(m.text).toContain("https://x.test/reset-password?token=abc");
    expect(m.html).toContain('href="https://x.test/reset-password?token=abc"');
  });

  it("링크의 따옴표, 꺾쇠를 이스케이프한다", () => {
    const m = passwordResetMail("a@b.c", 'https://x.test/?t="><script>');
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&quot;&gt;&lt;script&gt;");
  });
});
