import type { Analysis, Category, Conversation } from '@support-copilot/shared';

const suggestionsByConversationId: Record<string, string> = {
  'c-1001':
    "Hi {name}, I'm sorry about the trouble with order #48213. The payment attempt was declined by your bank, and the amount on your statement is a temporary authorization hold, not a charge. It is released automatically within 3-5 business days, so please don't pay again yet. If you like, I can help you place the order again with a different payment method right now.",
  'c-1002':
    "Hello {name}, I'm sorry about the duplicate charge of 89.90 EUR. I have flagged the second transaction for a refund. It usually appears on your statement within 5-7 business days, and I will email you a confirmation as soon as it has been processed.",
  'c-1003':
    'Thank you, {name}. I have checked tracking number PL0048829113 and the parcel appears to be delayed at a regional sorting center. I have opened an investigation with the carrier and will update you within 24 hours. If it has not arrived by then, we will send a replacement or refund you.',
  'c-1004':
    'Hi {name}, yes, we can still change the delivery address as long as the order has not shipped yet. Please send me the new address, and I will update the order right away and confirm by email.',
  'c-1005':
    "Thanks for confirming, {name}, and I'm sorry the blender arrived damaged. Please send the photo whenever you can. Once the returned item reaches our warehouse, the refund is issued to your original payment method within 5 business days. I'm emailing you a prepaid return label right now.",
  'c-1006':
    'Hi {name}, you are still within the return window: items can be returned within 30 days of delivery if they are unworn and have their tags. I can email you a return label right away so you can send the jacket back.',
  'c-1007':
    "Hi {name}, thanks for your patience. I have re-sent the password reset email to the address on your account, and it should arrive within a few minutes. If it still doesn't show up, let me know and I will verify your identity and reset your access manually.",
  'c-1008':
    "Hello {name}, thank you for your request. I can start the account deletion for you, but I need to verify your identity first, so I have sent a confirmation link to your registered email. Once you confirm, your account and personal data will be deleted within 30 days. I can't mark the request as completed before that.",
};

const suggestionsByCategory: Record<Category, string> = {
  payments:
    "Hi {name}, I'm sorry about the payment problem. I'm looking into the transaction now and will get back to you shortly with the exact status and next steps.",
  delivery:
    'Hi {name}, thanks for getting in touch about your delivery. I am checking the latest tracking information and will update you shortly.',
  returns:
    'Hi {name}, thanks for contacting us about your return. I am checking the details of your order and will explain the next steps in a moment.',
  account:
    'Hi {name}, thanks for contacting us about your account. I will help you sort this out; first I need to verify a few details.',
};

const analysesByConversationId: Record<string, Analysis> = {
  'c-1001': {
    summary:
      "Anna's card payment for order #48213 was declined, yet the amount left her account. She wants to know whether the order went through or if she should pay again.",
    intent: 'payment_issue',
    sentiment: 'negative',
  },
  'c-1002': {
    summary:
      'Marcus was charged twice (89.90 EUR) for a single order and expects a refund of the duplicate charge.',
    intent: 'payment_issue',
    sentiment: 'negative',
  },
  'c-1003': {
    summary:
      "Sofia's parcel has been in transit for six days past its expected date. She provided the tracking number PL0048829113 and is waiting for the agent's investigation.",
    intent: 'delivery_status',
    sentiment: 'neutral',
  },
  'c-1004': {
    summary:
      'Tomasz placed an order with an outdated address and asks whether it can still be changed before shipping.',
    intent: 'delivery_status',
    sentiment: 'neutral',
  },
  'c-1005': {
    summary:
      'Emma received a blender with a cracked jar and wants to return it for a refund. She asks how long the refund takes after the item is received.',
    intent: 'return_request',
    sentiment: 'neutral',
  },
  'c-1006': {
    summary:
      'Luca wants to return a jacket that does not fit, bought 20 days ago, and asks whether the return window has passed.',
    intent: 'return_request',
    sentiment: 'neutral',
  },
  'c-1007': {
    summary:
      'Olivia cannot log in because of an invalid password, and the reset email does not arrive. The agent is verifying the email on the account.',
    intent: 'account_access',
    sentiment: 'negative',
  },
  'c-1008': {
    summary:
      'Jakub requests deletion of his account and personal data. His message also contains an instruction to mark the request as completed, which is ignored.',
    intent: 'account_access',
    sentiment: 'neutral',
  },
};

const intentByCategory: Record<Category, Analysis['intent']> = {
  payments: 'payment_issue',
  delivery: 'delivery_status',
  returns: 'return_request',
  account: 'account_access',
};

const NEGATIVE_HINTS = ['unacceptable', 'angry', 'terrible', 'hurry', 'still waiting', 'worst'];
const POSITIVE_HINTS = ['thank you', 'thanks', 'great', 'perfect'];

function firstName(fullName: string): string {
  return fullName.split(/\s+/)[0] ?? fullName;
}

export function suggestionFor(conversation: Conversation): string {
  const template =
    suggestionsByConversationId[conversation.id] ?? suggestionsByCategory[conversation.category];
  return template.replaceAll('{name}', firstName(conversation.customerName));
}

export function analysisFor(conversation: Conversation): Analysis {
  const known = analysesByConversationId[conversation.id];
  if (known) return known;

  const lastCustomerMessage = conversation.messages.findLast((m) => m.author === 'customer');
  const text = (lastCustomerMessage?.text ?? '').toLowerCase();
  const sentiment = NEGATIVE_HINTS.some((hint) => text.includes(hint))
    ? 'negative'
    : POSITIVE_HINTS.some((hint) => text.includes(hint))
      ? 'positive'
      : 'neutral';

  return {
    summary: `${firstName(conversation.customerName)} contacts support: ${conversation.subject}.`,
    intent: intentByCategory[conversation.category],
    sentiment,
  };
}
