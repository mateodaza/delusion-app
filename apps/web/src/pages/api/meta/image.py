import os
from meta_ai_api import MetaAI
import json

def generate_image(prompt):
    fb_email = os.environ.get('FB_EMAIL')
    fb_password = os.environ.get('FB_PASSWORD')
    
    if not fb_email or not fb_password:
        return json.dumps({"error": "Facebook credentials not set in environment variables"})

    try:
        ai = MetaAI(fb_email=fb_email, fb_password=fb_password)
        resp = ai.prompt(message=f"Generate an image of {prompt}")
        return json.dumps({"image_url": resp})
    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        print(generate_image(sys.argv[1]))
    else:
        print(json.dumps({"error": "No prompt provided"}))