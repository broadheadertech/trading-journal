//+------------------------------------------------------------------+
//|                                                  tradia-sync.mq5 |
//|                                            Tradia Trading Journal |
//|                                          https://tradia.app       |
//+------------------------------------------------------------------+
//
//  Auto-syncs closed MT5 deals to your Tradia journal via webhook.
//  This EA does NOT place trades — it only reads your trade history.
//
//  Setup:
//    1. Drop into MQL5/Experts folder
//    2. In MT5: Tools → Options → Expert Advisors → enable
//       "Allow WebRequest for listed URL" and add your Tradia webhook URL
//    3. Drag onto any chart, paste your sync token in inputs, click OK
//+------------------------------------------------------------------+

#property copyright "Tradia"
#property link      "https://tradia.app"
#property version   "1.00"
#property strict

input string  WebhookUrl       = "https://YOUR-DEPLOYMENT.convex.site/api/mt5-sync";
input string  SyncToken        = "";        // paste your token from Tradia → Connect Broker
input int     BackfillDays     = 90;        // how many days of history to send on startup
input bool    EnableLogging    = true;      // print sync activity to Experts tab

datetime g_lastSyncedDealTime = 0;

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   if(StringLen(SyncToken) < 8)
     {
      Print("[Tradia] ERROR: SyncToken is required. Paste it from Tradia → Connect Broker.");
      return(INIT_PARAMETERS_INCORRECT);
     }
   if(StringFind(WebhookUrl, "http") != 0)
     {
      Print("[Tradia] ERROR: WebhookUrl must start with https://");
      return(INIT_PARAMETERS_INCORRECT);
     }

   if(EnableLogging) PrintFormat("[Tradia] Starting backfill of last %d days...", BackfillDays);

   datetime from = TimeCurrent() - BackfillDays * 86400;
   int sent = SendDealsSince(from);

   g_lastSyncedDealTime = TimeCurrent();
   if(EnableLogging) PrintFormat("[Tradia] Backfill complete. %d deals queued. Listening for new trades.", sent);
   EventSetTimer(60); // periodic safety net (re-sync any missed deals each minute)
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

//+------------------------------------------------------------------+
//| Catch new closed deals as they happen                            |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if(trans.deal == 0) return;

   if(!HistoryDealSelect(trans.deal)) return;

   // Only sync deals that close a position (DEAL_ENTRY_OUT or _OUT_BY)
   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) return;

   SendDealById(trans.deal);
  }

//+------------------------------------------------------------------+
//| Periodic re-sync (safety net for events missed during downtime)  |
//+------------------------------------------------------------------+
void OnTimer()
  {
   datetime since = g_lastSyncedDealTime > 0 ? g_lastSyncedDealTime - 300 : 0;
   if(since == 0) return;
   int sent = SendDealsSince(since);
   if(sent > 0 && EnableLogging) PrintFormat("[Tradia] Re-sync caught %d deal(s).", sent);
   g_lastSyncedDealTime = TimeCurrent();
  }

//+------------------------------------------------------------------+
//| Send all closing deals from `from` until now                     |
//+------------------------------------------------------------------+
int SendDealsSince(datetime from)
  {
   if(!HistorySelect(from, TimeCurrent())) return 0;
   int total = HistoryDealsTotal();
   int sent = 0;
   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;
      ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT && entry != DEAL_ENTRY_OUT_BY) continue;
      if(SendDealById(ticket)) sent++;
     }
   return sent;
  }

//+------------------------------------------------------------------+
//| Build payload for one closed deal and POST it                    |
//+------------------------------------------------------------------+
bool SendDealById(ulong closeTicket)
  {
   if(!HistoryDealSelect(closeTicket)) return false;

   string symbol      = HistoryDealGetString(closeTicket, DEAL_SYMBOL);
   long   positionId  = HistoryDealGetInteger(closeTicket, DEAL_POSITION_ID);
   double closePrice  = HistoryDealGetDouble(closeTicket, DEAL_PRICE);
   datetime closeTime = (datetime)HistoryDealGetInteger(closeTicket, DEAL_TIME);
   double volume      = HistoryDealGetDouble(closeTicket, DEAL_VOLUME);
   double profit      = HistoryDealGetDouble(closeTicket, DEAL_PROFIT);
   double commission  = HistoryDealGetDouble(closeTicket, DEAL_COMMISSION);
   double swap        = HistoryDealGetDouble(closeTicket, DEAL_SWAP);
   double sl          = HistoryDealGetDouble(closeTicket, DEAL_SL);
   double tp          = HistoryDealGetDouble(closeTicket, DEAL_TP);
   string comment     = HistoryDealGetString(closeTicket, DEAL_COMMENT);
   ENUM_DEAL_TYPE closeType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(closeTicket, DEAL_TYPE);

   // Find the matching opening deal for this position
   double openPrice = 0;
   datetime openTime = 0;
   ENUM_DEAL_TYPE openType = DEAL_TYPE_BUY;
   bool foundOpen = false;

   if(HistorySelectByPosition(positionId))
     {
      int total = HistoryDealsTotal();
      for(int i = 0; i < total; i++)
        {
         ulong t = HistoryDealGetTicket(i);
         if(t == 0 || t == closeTicket) continue;
         ENUM_DEAL_ENTRY e = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(t, DEAL_ENTRY);
         if(e == DEAL_ENTRY_IN)
           {
            openPrice = HistoryDealGetDouble(t, DEAL_PRICE);
            openTime  = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
            openType  = (ENUM_DEAL_TYPE)HistoryDealGetInteger(t, DEAL_TYPE);
            foundOpen = true;
            break;
           }
        }
     }

   if(!foundOpen)
     {
      if(EnableLogging) PrintFormat("[Tradia] No open deal for position %d, skipping.", positionId);
      return false;
     }

   // Direction is from the OPENING deal (BUY=long, SELL=short)
   string direction = (openType == DEAL_TYPE_BUY) ? "long" : "short";

   string payload = "{";
   payload += "\"token\":\""        + SyncToken + "\",";
   payload += "\"ticket\":\""       + IntegerToString(positionId) + "\",";
   payload += "\"symbol\":\""       + symbol + "\",";
   payload += "\"direction\":\""    + direction + "\",";
   payload += "\"volume\":"         + DoubleToString(volume, 2) + ",";
   payload += "\"entryPrice\":"     + DoubleToString(openPrice, _Digits) + ",";
   payload += "\"exitPrice\":"      + DoubleToString(closePrice, _Digits) + ",";
   payload += "\"entryDate\":\""    + IsoTime(openTime) + "\",";
   payload += "\"exitDate\":\""     + IsoTime(closeTime) + "\",";
   payload += "\"profit\":"         + DoubleToString(profit, 2) + ",";
   payload += "\"commission\":"     + DoubleToString(commission, 2) + ",";
   payload += "\"swap\":"           + DoubleToString(swap, 2);
   if(sl > 0) payload += ",\"stopLoss\":"   + DoubleToString(sl, _Digits);
   if(tp > 0) payload += ",\"takeProfit\":" + DoubleToString(tp, _Digits);
   if(StringLen(comment) > 0)
      payload += ",\"comment\":\"" + JsonEscape(comment) + "\"";
   payload += "}";

   return PostJson(payload);
  }

//+------------------------------------------------------------------+
//| HTTP POST the JSON payload to the webhook                        |
//+------------------------------------------------------------------+
bool PostJson(const string body)
  {
   // Convert JSON string to UTF-8 byte array. With WHOLE_ARRAY, MQL5 appends a
   // trailing null terminator we need to strip — otherwise the server gets a
   // null byte after the closing `}` and rejects the payload as invalid JSON.
   char post[];
   int n = StringToCharArray(body, post, 0, WHOLE_ARRAY, CP_UTF8);
   if(n > 0) ArrayResize(post, n - 1);

   if(EnableLogging) PrintFormat("[Tradia DEBUG] Sending %d bytes: %s", ArraySize(post), body);

   char result[];
   string headers = "Content-Type: application/json\r\nX-Sync-Token: " + SyncToken + "\r\n";
   string resHeaders;
   int timeoutMs = 5000;

   ResetLastError();
   int code = WebRequest("POST", WebhookUrl, headers, timeoutMs, post, result, resHeaders);

   if(code == -1)
     {
      int err = GetLastError();
      PrintFormat("[Tradia] WebRequest failed (err=%d). Did you allow the URL in Tools → Options → Expert Advisors?", err);
      return false;
     }
   if(code != 200)
     {
      string resBody = CharArrayToString(result, 0, ArraySize(result));
      PrintFormat("[Tradia] Server responded %d: %s", code, resBody);
      return false;
     }
   if(EnableLogging) PrintFormat("[Tradia] Synced deal OK.");
   return true;
  }

//+------------------------------------------------------------------+
//| Helpers                                                          |
//+------------------------------------------------------------------+
string IsoTime(datetime t)
  {
   MqlDateTime st;
   TimeToStruct(t, st);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
                       st.year, st.mon, st.day, st.hour, st.min, st.sec);
  }

string JsonEscape(const string s)
  {
   string out = s;
   StringReplace(out, "\\", "\\\\");
   StringReplace(out, "\"", "\\\"");
   StringReplace(out, "\n", "\\n");
   StringReplace(out, "\r", "\\r");
   StringReplace(out, "\t", "\\t");
   return out;
  }
//+------------------------------------------------------------------+
