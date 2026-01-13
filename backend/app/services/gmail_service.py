import os
import json
import base64
from datetime import datetime
from email.mime.text import MIMEText
from typing import Optional, List, Dict, Any

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

class GmailService:
    def __init__(self):
        self.mock_mode = os.getenv("MOCK_GMAIL", "true").lower() == "true"
        self.client_id = os.getenv("GMAIL_CLIENT_ID")
        self.client_secret = os.getenv("GMAIL_CLIENT_SECRET")
        self.redirect_uri = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:9000/api/v1/auth/gmail/callback")
        
        self.scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.modify'
        ]
        
        # Store user credentials (in production, use a proper database)
        self.user_credentials: Optional[Credentials] = None
        self.service = None
        
        # Token file path
        self.token_file = "token.json"
        
        # Try to load saved credentials
        self._load_credentials()
        
        # Mock emails for demo
        self._mock_emails = self._generate_mock_emails()

    def _load_credentials(self):
        """Load credentials from file if they exist"""
        if os.path.exists(self.token_file):
            try:
                self.user_credentials = Credentials.from_authorized_user_file(self.token_file, self.scopes)
                
                # Refresh if expired
                from google.auth.transport.requests import Request
                if self.user_credentials and self.user_credentials.expired and self.user_credentials.refresh_token:
                    try:
                        self.user_credentials.refresh(Request())
                        # Save refreshed token
                        with open(self.token_file, 'w') as token:
                            token.write(self.user_credentials.to_json())
                    except Exception as e:
                        print(f"Error refreshing token: {e}")
                        self.user_credentials = None
                        os.remove(self.token_file)

                if self.user_credentials and self.user_credentials.valid:
                    self.service = build('gmail', 'v1', credentials=self.user_credentials)
                    self.mock_mode = False
                    print("Loaded saved credentials successfully")
            except Exception as e:
                print(f"Error loading credentials: {e}")
                self.user_credentials = None

    def _save_credentials(self):
        """Save credentials to file"""
        if self.user_credentials:
            with open(self.token_file, 'w') as token:
                token.write(self.user_credentials.to_json())

    def _generate_mock_emails(self) -> List[Dict]:
        from datetime import timedelta
        return [
            {
                "id": "email_1",
                "subject": "URGENT: Production Server Down",
                "from": "alerts@monitor.com",
                "date": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "snippet": "Critical alert: Server 42 is not responding...",
                "category": "urgent",
                "priority": "high",
                "unread": True,
                "body": "Full report attached. Please investigate immediately."
            },
            {
                "id": "email_2",
                "subject": "Weekly Update: AI Project",
                "from": "manager@company.com",
                "date": (datetime.now() - timedelta(hours=2)).isoformat(),
                "snippet": "Here is the progress report for the current sprint...",
                "category": "work",
                "priority": "medium",
                "unread": True,
                "body": "Team, great work on the agents. Let's discuss tomorrow."
            },
            {
                "id": "email_3",
                "subject": "Lunch Plans?",
                "from": "friend@gmail.com",
                "date": (datetime.now() - timedelta(days=1)).isoformat(),
                "snippet": "Hey, want to grab tacos this Friday?",
                "category": "personal",
                "priority": "low",
                "unread": False,
                "body": "Let me know!"
            }
        ]

    def get_auth_url(self) -> str:
        """Generate Google OAuth authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'
        )
        return auth_url

    async def handle_oauth_callback(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )
            flow.fetch_token(code=code)
            
            self.user_credentials = flow.credentials
            self.service = build('gmail', 'v1', credentials=self.user_credentials)
            self.mock_mode = False  # Switch to real mode
            
            # Save credentials
            self._save_credentials()
            
            # Get user email
            profile = self.service.users().getProfile(userId='me').execute()
            
            return {
                "success": True,
                "email": profile.get('emailAddress'),
                "message": "Gmail connected successfully!"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def is_connected(self) -> bool:
        """Check if Gmail is connected"""
        if self.user_credentials and self.user_credentials.expired and self.user_credentials.refresh_token:
            # Try to refresh implicitly by checking validity
            try:
                from google.auth.transport.requests import Request
                self.user_credentials.refresh(Request())
                self._save_credentials()
            except:
                pass
        return self.user_credentials is not None and self.user_credentials.valid and self.service is not None

    async def fetch_emails(self, max_results: int = 20) -> List[Dict]:
        """Fetch emails from Gmail"""
        if self.mock_mode or not self.is_connected():
            return self._mock_emails
        
        try:
            results = self.service.users().messages().list(
                userId='me',
                maxResults=max_results,
                labelIds=['INBOX']
            ).execute()
            
            messages = results.get('messages', [])
            emails = []
            
            for msg in messages:
                msg_data = self.service.users().messages().get(
                    userId='me',
                    id=msg['id'],
                    format='full'
                ).execute()
                
                headers = {h['name']: h['value'] for h in msg_data['payload']['headers']}
                
                # Extract body
                body = ""
                if 'parts' in msg_data['payload']:
                    for part in msg_data['payload']['parts']:
                        if part['mimeType'] == 'text/plain':
                            body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                            break
                elif 'body' in msg_data['payload'] and 'data' in msg_data['payload']['body']:
                    body = base64.urlsafe_b64decode(msg_data['payload']['body']['data']).decode('utf-8')
                
                emails.append({
                    "id": msg['id'],
                    "subject": headers.get('Subject', 'No Subject'),
                    "from": headers.get('From', 'Unknown'),
                    "date": headers.get('Date', ''),
                    "snippet": msg_data.get('snippet', ''),
                    "category": self._categorize_email(headers, body),
                    "priority": self._get_priority(headers, body),
                    "unread": 'UNREAD' in msg_data.get('labelIds', []),
                    "body": body[:500]  # Truncate for display
                })
            
            return emails
        except Exception as e:
            print(f"Error fetching emails: {e}")
            return self._mock_emails

    def _categorize_email(self, headers: Dict, body: str) -> str:
        """Simple email categorization"""
        subject = headers.get('Subject', '').lower()
        sender = headers.get('From', '').lower()
        
        if any(word in subject for word in ['urgent', 'alert', 'critical', 'asap']):
            return 'urgent'
        elif any(word in sender for word in ['noreply', 'notification', 'newsletter']):
            return 'notification'
        elif any(word in sender for word in ['work', 'company', 'team', 'project']):
            return 'work'
        else:
            return 'personal'

    def _get_priority(self, headers: Dict, body: str) -> str:
        """Determine email priority"""
        subject = headers.get('Subject', '').lower()
        
        if any(word in subject for word in ['urgent', 'critical', 'asap', 'important']):
            return 'high'
        elif any(word in subject for word in ['newsletter', 'promo', 'update']):
            return 'low'
        else:
            return 'medium'

    async def send_reply(self, email_id: str, content: str) -> Dict[str, Any]:
        """Send a reply to an email"""
        print(f"Attempting to send reply to email {email_id}")
        
        if self.mock_mode or not self.is_connected():
            import asyncio
            await asyncio.sleep(1)
            print("Mock mode: simulating reply sent")
            return {
                "success": True,
                "id": f"reply_{email_id}",
                "message": "Reply sent (mock mode)"
            }
        
        try:
            # Get original message
            original = self.service.users().messages().get(
                userId='me',
                id=email_id,
                format='full'
            ).execute()
            
            headers = {h['name']: h['value'] for h in original['payload']['headers']}
            
            # Get user's email address for 'from' header
            profile = self.service.users().getProfile(userId='me').execute()
            user_email = profile.get('emailAddress', '')
            
            # Create reply
            message = MIMEText(content)
            message['from'] = user_email
            message['to'] = headers.get('From', '')
            message['subject'] = f"Re: {headers.get('Subject', '')}"
            message['In-Reply-To'] = headers.get('Message-ID', '')
            message['References'] = headers.get('Message-ID', '')
            
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            print(f"Sending reply from {user_email} to {headers.get('From', '')}")
            
            sent = self.service.users().messages().send(
                userId='me',
                body={'raw': raw, 'threadId': original.get('threadId')}
            ).execute()
            
            print(f"Reply sent successfully with id: {sent['id']}")
            
            return {
                "success": True,
                "id": sent['id'],
                "message": "Reply sent successfully!"
            }
        except Exception as e:
            print(f"Error sending reply: {e}")
            return {"success": False, "error": str(e)}

    async def disconnect(self):
        """Disconnect Gmail account"""
        self.user_credentials = None
        self.service = None
        self.mock_mode = True
        return {"success": True, "message": "Disconnected from Gmail"}


# Singleton instance
gmail_service = GmailService()
