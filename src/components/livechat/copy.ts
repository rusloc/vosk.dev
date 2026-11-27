/**
 * The live chat widget's words. The greeting, the owner label and the five status lines are the contract's
 * (docs/livechat/README.md, "Copy"); the rest (title, labels, the email form's replies) are the widget's own.
 */
export const COPY = {
  greeting:
    "Hi, I'm Kirill. Ask me anything about Power BI, Fabric or automation.",
  owner: "Kirill",
  you: "You",
  title: "Chat with Kirill",
  open: "Open chat",
  close: "Close chat",
  unread: (n: number) => `${n} unread`,
  newMessage: "New message from Kirill",
  inputLabel: "Your message",
  placeholder: "Type a message",
  send: "Send",
  sending: "Sending…",
  notDelivered: "Not delivered.",
  retry: "Retry",
  closed: "This chat was closed. Send a message to start again",
  slowDown: "Slow down a little",
  emailPrompt: "I'm away from my desk. Leave your email and I'll reply there.",
  emailLabel: "Your email",
  emailSend: "Send",
  emailThanks: "Thanks. I'll reply by email.",
  emailInvalid: "That email doesn't look right.",
  emailFailed: "That didn't go through. Try again.",
} as const;
