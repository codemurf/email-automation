from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import ai_service
from app.services.gmail_service import gmail_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/")
async def chat(request: ChatRequest):
    """AI-powered chat endpoint with email context"""
    
    message_lower = request.message.lower()
    
    # Fetch emails for any email-related query
    emails = []
    try:
        emails = await gmail_service.fetch_emails(max_results=20)
    except Exception as e:
        print(f"Error fetching emails: {e}")
    
    # Handle specific commands
    
    # Read/Show specific email (e.g., "show me 1st email", "read email 2")
    if any(word in message_lower for word in ["read", "show", "open", "full"]) and any(word in message_lower for word in ["1st", "2nd", "3rd", "first", "second", "third", "email 1", "email 2", "email 3", "#1", "#2", "#3", "one", "two", "three"]):
        return await handle_read_email(emails, request.message)
    
    # Reply to email with tone options
    reply_triggers = ["reply", "draft", "respond", "write to", "answer"]
    if any(trigger in message_lower for trigger in reply_triggers):
        return await handle_reply_draft(emails, request.message)
    
    # Send confirmation / Send with specific tone
    send_triggers = ["send", "continue", "use", "confirm", "yes"]
    if any(t in message_lower for t in send_triggers):
        # Check if it's a specific tone request OR a general confirmation
        has_tone = any(tone in message_lower for tone in ["professional", "friendly", "casual", "formal", "urgent"])
        is_confirmation = any(c in message_lower for c in ["it", "now", "email", "reply", "draft", "yes", "good"])
        
        if has_tone or is_confirmation:
             return await handle_send_reply(emails, request.message)
    
    # Important emails
    if "important" in message_lower:
        return await handle_important_emails(emails)
    
    # Compose/Send new email
    # Triggers: "send email", "write mail", "draft message", "compose to"
    compose_keywords = ["send", "write", "draft", "compose", "create"]
    noun_keywords = ["email", "mail", "message", "note"]
    
    if any(k in message_lower for k in compose_keywords) and (
        any(n in message_lower for n in noun_keywords) or " to " in message_lower
    ):
        # Exclude "reply" intent
        if "reply" not in message_lower:
            return await handle_compose_email(request.message)

    if "summarize" in message_lower or "summary" in message_lower:
        return await handle_summarize(emails, request.message)
    
    elif "urgent" in message_lower:
        return await handle_urgent(emails)
    
    elif "statistic" in message_lower or "stats" in message_lower:
        return await handle_statistics(emails)
    
    elif "work" in message_lower and ("find" in message_lower or "show" in message_lower):
        return await handle_work_emails(emails)
    
    elif "find" in message_lower or "search" in message_lower:
        return await handle_search(emails, request.message)
    
    # General email query with context
    elif any(keyword in message_lower for keyword in ["email", "emails", "inbox", "mail", "unread"]):
        email_context = build_email_context(emails)
        response = await ai_service.chat_with_context(request.message, email_context)
        return {"response": response}
    
    # Regular chat without email context
    response = await ai_service.chat(request.message)
    return {"response": response}


async def handle_read_email(emails: list, message: str):
    """Handle reading a specific email"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    # Parse which email number
    message_lower = message.lower()
    email_index = 0  # Default to first
    
    number_map = {
        '1st': 0, 'first': 0, 'one': 0, '#1': 0, 'email 1': 0, '1': 0,
        '2nd': 1, 'second': 1, 'two': 1, '#2': 1, 'email 2': 1, '2': 1,
        '3rd': 2, 'third': 2, 'three': 2, '#3': 2, 'email 3': 2, '3': 2,
        '4th': 3, 'fourth': 3, 'four': 3, '#4': 3, 'email 4': 3, '4': 3,
        '5th': 4, 'fifth': 4, 'five': 4, '#5': 4, 'email 5': 4, '5': 4,
    }
    
    for key, idx in number_map.items():
        if key in message_lower:
            email_index = idx
            break
    
    if email_index >= len(emails):
        return {"response": f"❌ Email #{email_index + 1} not found. You have {len(emails)} emails."}
    
    email = emails[email_index]
    
    # Get category with emoji
    category_icons = {
        'work': '💼 Work',
        'personal': '👤 Personal', 
        'urgent': '🚨 Urgent',
        'notification': '🔔 Notification'
    }
    category = category_icons.get(email.get('category', 'other'), '📧 Other')
    
    # Get priority with emoji
    priority_icons = {'high': '🔴 High', 'medium': '🟡 Medium', 'low': '🟢 Low'}
    priority = priority_icons.get(email.get('priority', 'medium'), '⚪ Unknown')
    
    response = f"""📧 **Email #{email_index + 1}**

---

**📌 Subject:** {email.get('subject', 'No Subject')}

**👤 From:** {email.get('from', 'Unknown')}

**📅 Date:** {email.get('date', 'Unknown')}

**🏷️ Category:** {category}

**⚡ Priority:** {priority}

---

**📝 Content:**

{email.get('body', email.get('snippet', 'No content available.'))}

---

💡 *Tip: Say "reply to this email" to draft a response!*
"""
    
    return {"response": response}


# Store last viewed email for reply context
_last_email_context = {"email": None, "index": 0}
# Store compose context
_compose_context = {"to": None, "subject": None, "body": None, "tone": "professional"}
# Active mode: 'reply' or 'compose'
_active_mode = "reply"


async def handle_reply_draft(emails: list, message: str):
    """Handle reply drafting with tone options"""
    global _last_email_context, _active_mode
    _active_mode = "reply"
    global _last_email_context
    
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    # Parse which email to reply to
    message_lower = message.lower()
    email_index = None
    email = None
    
    # First try to match by number
    number_map = {
        '1st': 0, 'first': 0, 'one': 0, '#1': 0, 'email 1': 0,
        '2nd': 1, 'second': 1, 'two': 1, '#2': 1, 'email 2': 1,
        '3rd': 2, 'third': 2, 'three': 2, '#3': 2, 'email 3': 2,
        '4th': 3, 'fourth': 3, 'four': 3, '#4': 3, 'email 4': 3,
        '5th': 4, 'fifth': 4, 'five': 4, '#5': 4, 'email 5': 4,
    }
    
    for key, idx in number_map.items():
        if key in message_lower:
            email_index = idx
            break
    
    # If no number found, try to match by sender name
    if email_index is None:
        # Extract potential names from message (remove common words)
        stop_words = ['reply', 'to', 'the', 'email', 'from', 'mail', 'message', 'send', 'write', 'draft', 'a', 'an']
        words = message_lower.split()
        search_terms = [w for w in words if w not in stop_words and len(w) > 2]
        
        # Search for matching sender
        for i, e in enumerate(emails):
            sender = e.get('from', '').lower()
            subject = e.get('subject', '').lower()
            if any(term in sender or term in subject for term in search_terms):
                email_index = i
                break
    
    # If still no match, use last viewed or first email
    if email_index is None:
        email_index = _last_email_context.get("index", 0)
    
    if email_index >= len(emails):
        email_index = 0
    
    email = emails[email_index]
    _last_email_context = {"email": email, "index": email_index}
    
    # Generate preview draft with AI
    preview_reply = await ai_service.generate_email_reply(
        email.get('subject', ''),
        email.get('body', email.get('snippet', '')),
        email.get('from', ''),
        'professional'  # Default tone for preview
    )
    
    response = f"""✉️ **Draft Reply to Email #{email_index + 1}**

---

**📌 Replying to:** {email.get('subject', 'No Subject')}
**👤 From:** {email.get('from', 'Unknown')}

---

**📝 Draft Reply (Professional):**

{preview_reply[:500]}...

---

**🎨 Choose a tone to continue:**

• 💼 Say **"use professional"** - Formal business tone
• 😊 Say **"use friendly"** - Warm and approachable  
• ⚡ Say **"use urgent"** - Time-sensitive response
• 🎯 Say **"use casual"** - Relaxed and informal

Or type: **"send professional reply"** to send immediately!
"""
    
    return {"response": response}


async def handle_send_reply(emails: list, message: str):
    """Handle sending email (reply or new)"""
    global _last_email_context, _active_mode, _compose_context
    
    tone_icons = {'professional': '💼', 'friendly': '😊', 'urgent': '⚡', 'casual': '🎯'}

    # Determine tone from message
    message_lower = message.lower()
    tone = "professional"
    if "friendly" in message_lower: tone = "friendly"
    elif "casual" in message_lower: tone = "casual"
    elif "urgent" in message_lower: tone = "urgent"
    elif "formal" in message_lower: tone = "professional"
    
    # === COMPOSE MODE ===
    if _active_mode == "compose":
        to = _compose_context.get("to")
        subject = _compose_context.get("subject")
        body = _compose_context.get("body")
        
        if not to:
             return {"response": "⚠️ I don't know who to send this to. Please say **'Send email to [Name]'** to start."}
            
        # If tone changed in this step, regenerate
        # Or if body is missing
        if not body or (any(t in message_lower for t in tone_icons.keys()) and tone != _compose_context.get("tone")):
             body = await ai_service.generate_email_reply(
                subject, 
                f"Write a new email to {to} about {subject}. Tone: {tone}.", 
                to, 
                tone
             )
        
        # Send
        result = await gmail_service.send_email(to, subject, body)
        
        if result.get('success'):
            return {"response": f"""✅ **Email Sent Successfully!**

---

**📌 To:** {to}
**📝 Subject:** {subject}
**🎨 Tone:** {tone_icons.get(tone, '📧')} {tone.capitalize()}

---

**📧 Sent Message:**

{body}

---

🎉 Email sent!
"""}
        else:
             return {"response": f"""⚠️ **Sending Failed**

I couldn't send the email. Error: {result.get('error')}

---

**Draft Content:**
{body}
"""}

    # === REPLY MODE (Default) ===
    email = _last_email_context.get("email")
    
    if not email:
        if not emails:
            return {"response": "📭 No emails found. Please first view an email using 'show me 1st email'."}
        email = emails[0]
    
    # Generate the full reply
    reply_content = await ai_service.generate_email_reply(
        email.get('subject', ''),
        email.get('body', email.get('snippet', '')),
        email.get('from', ''),
        tone
    )
    
    # Send the reply
    result = await gmail_service.send_reply(email.get('id'), reply_content)
    
    if result.get('success'):
        response = f"""✅ **Reply Sent Successfully!**

---

**📌 To:** {email.get('from', 'Unknown')}
**📝 Subject:** Re: {email.get('subject', 'No Subject')}
**🎨 Tone:** {tone_icons.get(tone, '📧')} {tone.capitalize()}

---

**📧 Sent Message:**

{reply_content}

---

🎉 Email sent! Need anything else?
"""
    else:
        response = f"""⚠️ **Reply Generated (Demo Mode)**

Since Gmail is not fully connected, here's the reply that would be sent:

---

**📌 To:** {email.get('from', 'Unknown')}
**📝 Subject:** Re: {email.get('subject', 'No Subject')}
**🎨 Tone:** {tone_icons.get(tone, '📧')} {tone.capitalize()}

---

{reply_content}

---

💡 *Connect Gmail in Settings to send emails directly!*
"""
    
    return {"response": response}


async def handle_compose_email(message: str):
    """Handle composing and sending a new email"""
    global _compose_context, _active_mode
    _active_mode = "compose"
    
    # Extract recipient and subject
    # Pattern: "send email to [who] about [what]"
    words = message.split()
    recipient = None
    subject = "Status Update" # Default
    
    if "to" in words:
        try:
            start_idx = words.index("to") + 1
            # Find where 'about' starts, or end of string
            end_idx = len(words)
            if "about" in words:
                end_idx = words.index("about")
            
            recipient_words = words[start_idx:end_idx]
            recipient = " ".join(recipient_words)
            
            # Remove punctuation
            recipient = recipient.strip(".,?!")
        except:
            pass
            
    if "about" in words:
        try:
            start_idx = words.index("about") + 1
            subject_words = words[start_idx:]
            subject = " ".join(subject_words).capitalize()
        except:
            pass

    if not recipient:
        return {"response": "✉️ To whom should I send this email? Please say **'Send email to [Name/Email]'**."}

    # Generate draft with AI
    ai_draft = await ai_service.generate_email_reply(
        subject,
        f"Write a new email to {recipient} about {subject}. Tone: Professional.",
        recipient,
        "professional"
    )

    _compose_context = {
        "to": recipient, 
        "subject": subject, 
        "body": ai_draft, 
        "tone": "professional"
    }

    response = f"""✉️ **Drafting New Email**

---

**📌 To:** {recipient}
**📝 Subject:** {subject}

---

**Draft Content:**

{ai_draft}

---

**🚀 Ready to send?**

• Say **"Send it"** to send now
• Say **"Change to friendly"** to adjust tone
• Say **"Add [details]"** to refine
"""
    return {"response": response}


async def handle_important_emails(emails: list):
    """Handle important/priority emails request"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    # Filter important emails (high priority or urgent category)
    important = [e for e in emails if e.get('priority') == 'high' or e.get('category') == 'urgent' or e.get('category') == 'work']
    
    if not important:
        return {"response": "✅ **No urgent emails!** Your inbox looks calm. 🌿"}
    
    response = f"""⭐ **Important Emails ({len(important)})**

"""
    
    for i, email in enumerate(important[:5], 1):
        priority_icon = "🔴" if email.get('priority') == 'high' else "🟡"
        category_icon = "🚨" if email.get('category') == 'urgent' else "💼" if email.get('category') == 'work' else "📧"
        
        response += f"""{priority_icon} **{i}. {email.get('subject', 'No Subject')[:45]}**
   {category_icon} From: {email.get('from', 'Unknown')[:35]}
   📝 {email.get('snippet', '')[:60]}...

"""
    
    response += """---

💡 **Quick Actions:**
• Say **"show me 1st email"** to view details
• Say **"reply to 1st email"** to draft a response
"""
    
    return {"response": response}


def build_email_context(emails: list) -> str:
    """Build email context string for AI"""
    if not emails:
        return "No emails found. The user may need to connect their Gmail account."
    
    context = ""
    for i, email in enumerate(emails[:10], 1):
        context += f"{i}. From: {email.get('from', 'Unknown')}\n"
        context += f"   Subject: {email.get('subject', 'No subject')}\n"
        context += f"   Category: {email.get('category', 'unknown')}\n"
        context += f"   Priority: {email.get('priority', 'medium')}\n"
        context += f"   Body: {email.get('body', email.get('snippet', ''))[:150]}...\n\n"
    return context


async def handle_summarize(emails: list, message: str):
    """Handle email summarization requests"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings to see your emails."}
    
    # Build summary
    total = len(emails)
    urgent = len([e for e in emails if e.get('category') == 'urgent' or e.get('priority') == 'high'])
    work = len([e for e in emails if e.get('category') == 'work'])
    personal = len([e for e in emails if e.get('category') == 'personal'])
    unread = len([e for e in emails if e.get('unread', False)])
    
    summary = f"""📊 **Email Summary**

📬 **Total Emails:** {total}
🔴 **Urgent/High Priority:** {urgent}
💼 **Work Emails:** {work}
👤 **Personal Emails:** {personal}
📩 **Unread:** {unread}

---

**Latest Emails:**
"""
    
    for i, email in enumerate(emails[:5], 1):
        priority_icon = "🔴" if email.get('priority') == 'high' or email.get('category') == 'urgent' else "⚪"
        category_icon = "💼" if email.get('category') == 'work' else "👤" if email.get('category') == 'personal' else "🔔"
        summary += f"\n{priority_icon} {category_icon} **{email.get('subject', 'No subject')[:50]}**\n"
        summary += f"   From: {email.get('from', 'Unknown')[:40]}\n"
    
    if urgent > 0:
        summary += f"\n\n⚠️ You have **{urgent} urgent email(s)** that need attention!"
    
    return {"response": summary}


async def handle_urgent(emails: list):
    """Handle urgent email requests"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    urgent_emails = [e for e in emails if e.get('category') == 'urgent' or e.get('priority') == 'high']
    
    if not urgent_emails:
        return {"response": "✅ **Great news!** You have no urgent emails right now. 🎉"}
    
    response = f"🚨 **Urgent Emails ({len(urgent_emails)})**\n\n"
    
    for i, email in enumerate(urgent_emails[:5], 1):
        response += f"**{i}. {email.get('subject', 'No subject')}**\n"
        response += f"   📧 From: {email.get('from', 'Unknown')}\n"
        response += f"   📝 {email.get('snippet', '')[:100]}...\n\n"
    
    response += "\n💡 *Tip: Drag these to 'To Reply' in the Kanban board to auto-generate replies!*"
    
    return {"response": response}


async def handle_statistics(emails: list):
    """Handle email statistics requests"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    total = len(emails)
    
    # Count by category
    categories = {}
    priorities = {}
    senders = {}
    
    for email in emails:
        cat = email.get('category', 'other')
        categories[cat] = categories.get(cat, 0) + 1
        
        pri = email.get('priority', 'medium')
        priorities[pri] = priorities.get(pri, 0) + 1
        
        sender = email.get('from', 'Unknown').split('<')[0].strip()[:30]
        senders[sender] = senders.get(sender, 0) + 1
    
    response = f"""📈 **Email Statistics**

📬 **Total Emails Analyzed:** {total}

---

**📊 By Category:**
"""
    
    category_icons = {'work': '💼', 'personal': '👤', 'urgent': '🚨', 'notification': '🔔', 'other': '📧'}
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        icon = category_icons.get(cat, '📧')
        percentage = round(count / total * 100)
        response += f"{icon} {cat.capitalize()}: {count} ({percentage}%)\n"
    
    response += "\n**🎯 By Priority:**\n"
    priority_icons = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
    for pri, count in sorted(priorities.items(), key=lambda x: x[1], reverse=True):
        icon = priority_icons.get(pri, '⚪')
        percentage = round(count / total * 100)
        response += f"{icon} {pri.capitalize()}: {count} ({percentage}%)\n"
    
    response += "\n**👥 Top Senders:**\n"
    for sender, count in sorted(senders.items(), key=lambda x: x[1], reverse=True)[:5]:
        response += f"• {sender}: {count} email(s)\n"
    
    return {"response": response}


async def handle_work_emails(emails: list):
    """Handle work email requests"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    work_emails = [e for e in emails if e.get('category') == 'work']
    
    if not work_emails:
        return {"response": "💼 No work emails found in your recent inbox."}
    
    response = f"💼 **Work Emails ({len(work_emails)})**\n\n"
    
    for i, email in enumerate(work_emails[:7], 1):
        priority_icon = "🔴" if email.get('priority') == 'high' else "⚪"
        response += f"{priority_icon} **{i}. {email.get('subject', 'No subject')[:50]}**\n"
        response += f"   From: {email.get('from', 'Unknown')[:40]}\n"
        response += f"   Preview: {email.get('snippet', '')[:60]}...\n\n"
    
    return {"response": response}


async def handle_search(emails: list, query: str):
    """Handle email search requests"""
    if not emails:
        return {"response": "📭 No emails found. Please connect your Gmail account in Settings."}
    
    # Extract search terms (remove common words)
    stop_words = ['find', 'search', 'show', 'me', 'my', 'the', 'from', 'emails', 'email', 'about']
    words = query.lower().split()
    search_terms = [w for w in words if w not in stop_words and len(w) > 2]
    
    if not search_terms:
        return {"response": "🔍 Please specify what you're looking for. Example: 'Find emails from John' or 'Search meeting emails'"}
    
    # Search emails
    results = []
    for email in emails:
        email_text = f"{email.get('subject', '')} {email.get('from', '')} {email.get('snippet', '')}".lower()
        if any(term in email_text for term in search_terms):
            results.append(email)
    
    if not results:
        return {"response": f"🔍 No emails found matching '{' '.join(search_terms)}'. Try different keywords."}
    
    response = f"🔍 **Search Results for '{' '.join(search_terms)}' ({len(results)} found)**\n\n"
    
    for i, email in enumerate(results[:5], 1):
        response += f"**{i}. {email.get('subject', 'No subject')[:50]}**\n"
        response += f"   From: {email.get('from', 'Unknown')[:40]}\n"
        response += f"   {email.get('snippet', '')[:80]}...\n\n"
    
    return {"response": response}
