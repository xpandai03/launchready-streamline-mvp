#!/bin/bash
# Manual Late API Test Script
# Phase 2: Test Late API independently to isolate internal vs external issues
#
# Usage:
#   1. Set environment variables:
#      export LATE_API_KEY="your_api_key"
#      export INSTAGRAM_ACCOUNT_ID="account_id"
#      export VIDEO_URL="https://klap-video-url.com/video.mp4"
#   2. Run: bash scripts/test-late-api.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Late API Manual Test ===${NC}\n"

# Check required environment variables
if [ -z "$LATE_API_KEY" ]; then
  echo -e "${RED}Error: LATE_API_KEY environment variable not set${NC}"
  echo "Set it with: export LATE_API_KEY='your_api_key'"
  exit 1
fi

if [ -z "$INSTAGRAM_ACCOUNT_ID" ]; then
  echo -e "${YELLOW}Warning: INSTAGRAM_ACCOUNT_ID not set, using default${NC}"
  INSTAGRAM_ACCOUNT_ID="6900d2cd8bbca9c10cbfff74"
fi

if [ -z "$VIDEO_URL" ]; then
  echo -e "${YELLOW}Warning: VIDEO_URL not set, using test URL${NC}"
  VIDEO_URL="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
fi

if [ -z "$PROFILE_ID" ]; then
  echo -e "${YELLOW}Note: PROFILE_ID not set (optional)${NC}"
fi

echo -e "${GREEN}Configuration:${NC}"
echo "  API Key: ${LATE_API_KEY:0:20}..."
echo "  Instagram Account ID: $INSTAGRAM_ACCOUNT_ID"
echo "  Video URL: ${VIDEO_URL:0:60}..."
echo "  Profile ID: ${PROFILE_ID:-none}"
echo ""

# Build request body
if [ -n "$PROFILE_ID" ]; then
  REQUEST_BODY=$(cat <<EOF
{
  "content": "Test post from Streamline AI - $(date +%Y-%m-%d\ %H:%M:%S)",
  "profileId": "$PROFILE_ID",
  "platforms": [
    {
      "platform": "instagram",
      "accountId": "$INSTAGRAM_ACCOUNT_ID",
      "platformSpecificData": {
        "contentType": "reel"
      }
    }
  ],
  "mediaItems": [
    {
      "type": "video",
      "url": "$VIDEO_URL"
    }
  ],
  "publishNow": true
}
EOF
)
else
  REQUEST_BODY=$(cat <<EOF
{
  "content": "Test post from Streamline AI - $(date +%Y-%m-%d\ %H:%M:%S)",
  "platforms": [
    {
      "platform": "instagram",
      "accountId": "$INSTAGRAM_ACCOUNT_ID",
      "platformSpecificData": {
        "contentType": "reel"
      }
    }
  ],
  "mediaItems": [
    {
      "type": "video",
      "url": "$VIDEO_URL"
    }
  ],
  "publishNow": true
}
EOF
)
fi

echo -e "${YELLOW}Sending POST request to Late API...${NC}\n"

# Make the request with verbose output
RESPONSE=$(curl -X POST https://getlate.dev/api/v1/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $LATE_API_KEY" \
  -d "$REQUEST_BODY" \
  -w "\n\nHTTP_STATUS:%{http_code}" \
  -s -v 2>&1)

# Extract HTTP status
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)

# Extract response body (everything before HTTP_STATUS line)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo -e "${YELLOW}=== Response ===${NC}"
echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Headers and Body:"
echo "$RESPONSE_BODY" | grep -E "^< |^{|^}"

echo -e "\n${YELLOW}=== Interpretation ===${NC}"

if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo -e "${GREEN}✓ Success!${NC} Late API accepted the request"
  echo "This means the issue is likely in the app's request construction or error handling"
elif [ "$HTTP_STATUS" = "401" ] || [ "$HTTP_STATUS" = "403" ]; then
  echo -e "${RED}✗ Authentication Error${NC}"
  echo "Late API key is invalid or expired. Check LATE_API_KEY environment variable"
elif [ "$HTTP_STATUS" = "400" ]; then
  echo -e "${RED}✗ Bad Request${NC}"
  echo "Request body is malformed or missing required fields"
  echo "Check: accountId, videoUrl, profileId (if required)"
elif [ "$HTTP_STATUS" = "500" ] || [ "$HTTP_STATUS" = "502" ] || [ "$HTTP_STATUS" = "503" ]; then
  echo -e "${RED}✗ Late API Server Error${NC}"
  echo "The Late API itself is having issues (not your app's fault)"
else
  echo -e "${YELLOW}? Unexpected status: $HTTP_STATUS${NC}"
  echo "Review the response body above for details"
fi

echo ""
echo -e "${YELLOW}=== Next Steps ===${NC}"
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "201" ]; then
  echo "1. The Late API works externally ✓"
  echo "2. Check server/services/late.ts for request construction differences"
  echo "3. Check server logs for [Late Debug] output to compare payloads"
else
  echo "1. Fix the issue identified above"
  echo "2. Re-run this script to verify"
  echo "3. Then test again via the Streamline app"
fi
