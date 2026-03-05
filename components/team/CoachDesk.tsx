'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Search, Send, Eye, MessageSquare, ClipboardList, FileText, Clock,
  ChevronDown, Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberStat {
  userId: string;
  displayName: string;
  role: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  compliance: number;
}

interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
  joinedAt: string;
}

interface CoachDeskProps {
  workspaceId: string;
  memberStats: MemberStat[];
  members: WorkspaceMember[];
  myRole: string;
}

type DeskTab = 'chat' | 'assignments' | 'templates' | 'history';

function getRiskLevel(compliance: number, pnl: number): 'low' | 'medium' | 'high' {
  if (compliance < 50 || pnl < -2000) return 'high';
  if (compliance < 75 || pnl < -500) return 'medium';
  return 'low';
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-green-500/15 text-green-400',
    medium: 'bg-yellow-500/15 text-yellow-400',
    high: 'bg-red-500/15 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold capitalize ${styles[level]}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </span>
  );
}

export default function CoachDesk({ workspaceId, memberStats, members, myRole }: CoachDeskProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeskTab>('chat');
  const [messageText, setMessageText] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'shared'>('private');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = useMutation(api.workspaces.sendMessage);

  // Select first student by default
  const students = members.filter(m => m.role === 'member' || m.role === 'coach' || m.role === 'admin' || m.role === 'owner');
  const filteredStudents = searchQuery.trim()
    ? students.filter(s => s.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    : students;

  const selectedUser = selectedUserId
    ? students.find(s => s.userId === selectedUserId)
    : students[0];
  const selectedStat = selectedUser
    ? memberStats.find(s => s.userId === selectedUser.userId)
    : null;

  const messages = useQuery(
    api.workspaces.getMessages,
    selectedUser ? { workspaceId, otherUserId: selectedUser.userId } : 'skip'
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedUser) return;
    await sendMessage({
      workspaceId,
      toUserId: selectedUser.userId,
      message: messageText.trim(),
      visibility,
    });
    setMessageText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const risk = selectedStat
    ? getRiskLevel(selectedStat.compliance, selectedStat.totalPnL)
    : 'low';

  const deskTabs: { id: DeskTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={14} /> },
    { id: 'assignments', label: 'Assignments', icon: <ClipboardList size={14} /> },
    { id: 'templates', label: 'Templates', icon: <FileText size={14} /> },
    { id: 'history', label: 'History', icon: <Clock size={14} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -mx-4 sm:-mx-6 -my-6">
      {/* Left: student list */}
      <div className="w-[280px] shrink-0 border-r border-[var(--border)] bg-[var(--card)] flex flex-col">
        {/* Search */}
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 px-3 py-2 bg-[var(--muted)] rounded-lg border border-[var(--border)] text-sm">
            <Search size={14} className="text-[var(--muted-foreground)] shrink-0" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto">
          {filteredStudents.map(student => {
            const stat = memberStats.find(s => s.userId === student.userId);
            const isSelected = selectedUser?.userId === student.userId;
            return (
              <button
                key={student.userId}
                onClick={() => setSelectedUserId(student.userId)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--border)]/50',
                  isSelected
                    ? 'bg-[var(--accent)]/10'
                    : 'hover:bg-[var(--muted)]/50'
                )}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                    {student.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[var(--card)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{student.displayName}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                    {stat
                      ? `${stat.totalPnL >= 0 ? '+' : '-'}$${Math.abs(stat.totalPnL).toFixed(0)} · ${stat.totalTrades} trades`
                      : 'No data'}
                  </p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
              </button>
            );
          })}
          {filteredStudents.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">No students found</p>
          )}
        </div>
      </div>

      {/* Center: chat / content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUser ? (
          <>
            {/* Student header */}
            <div className="shrink-0 px-5 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                    {selectedUser.displayName[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[var(--card)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{selectedUser.displayName}</span>
                    <span className="text-xs text-green-400 font-medium">Online</span>
                    <span className="text-xs text-[var(--muted-foreground)]">/</span>
                    <RiskBadge level={risk} />
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    {selectedStat?.totalTrades ?? 0} trades · {Math.round(selectedStat?.compliance ?? 0)}% compliance
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-xl text-xs font-semibold transition-colors">
                <Eye size={14} />
                View as Student
              </button>
            </div>

            {/* Tab bar */}
            <div className="shrink-0 flex items-center gap-1 px-5 py-2 border-b border-[var(--border)]">
              {deskTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chat content */}
            {activeTab === 'chat' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {(!messages || messages.length === 0) ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-[var(--muted-foreground)]">
                        No messages yet. Start the conversation with {selectedUser.displayName}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg, i) => {
                        const isMe = msg.fromUserId !== selectedUser.userId;
                        return (
                          <div key={i} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                            <div className={cn(
                              'max-w-[70%] px-4 py-2.5 rounded-2xl text-sm',
                              isMe
                                ? 'bg-[var(--accent)] text-white rounded-br-md'
                                : 'bg-[var(--muted)] rounded-bl-md'
                            )}>
                              {msg.message}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Message input */}
                <div className="shrink-0 px-5 pb-4">
                  <div className="border border-[var(--border)] rounded-xl bg-[var(--card)] overflow-hidden">
                    <textarea
                      value={messageText}
                      onChange={e => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Message ${selectedUser.displayName}...`}
                      rows={2}
                      className="w-full px-4 py-3 bg-transparent outline-none text-sm resize-none"
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={visibility}
                          onChange={e => setVisibility(e.target.value as 'private' | 'shared')}
                          className="px-2 py-1 bg-[var(--muted)] border border-[var(--border)] rounded-md text-[11px] outline-none"
                        >
                          <option value="private">Private (staff only)</option>
                          <option value="shared">Shared (visible to student)</option>
                        </select>
                        <button className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                          <Paperclip size={14} />
                        </button>
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!messageText.trim()}
                        className="w-9 h-9 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center transition-colors disabled:opacity-40"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {activeTab === 'assignments' && 'Assignments coming soon'}
                  {activeTab === 'templates' && 'Templates coming soon'}
                  {activeTab === 'history' && 'History coming soon'}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--muted-foreground)]">Select a student to start coaching</p>
          </div>
        )}
      </div>

      {/* Right: stats sidebar */}
      {selectedUser && selectedStat && (
        <div className="w-[220px] shrink-0 border-l border-[var(--border)] bg-[var(--card)] p-4 space-y-4 overflow-y-auto hidden lg:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Stats</p>

          <div className="space-y-3">
            <div className="p-3 border border-[var(--border)] rounded-lg">
              <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                <span className="text-red-400">~</span> Net P&L
              </p>
              <p className={cn('text-xl font-bold', selectedStat.totalPnL >= 0 ? 'text-green-400' : 'text-red-400')}>
                {selectedStat.totalPnL >= 0 ? '+' : '-'}${Math.abs(selectedStat.totalPnL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="p-3 border border-[var(--border)] rounded-lg">
              <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                <span className="text-green-400">@</span> Win Rate
              </p>
              <p className="text-xl font-bold">{Math.round(selectedStat.winRate)}%</p>
            </div>

            <div className="p-3 border border-[var(--border)] rounded-lg">
              <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                <span className="text-[var(--accent)]">*</span> Trades
              </p>
              <p className="text-xl font-bold">{selectedStat.totalTrades}</p>
            </div>

            <div className="p-3 border border-[var(--border)] rounded-lg">
              <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                <span className="text-green-400">O</span> Compliance
              </p>
              <p className="text-xl font-bold">{Math.round(selectedStat.compliance)}%</p>
            </div>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] pt-2">Quick Actions</p>
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2.5 border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)] rounded-lg text-xs font-medium hover:bg-[var(--accent)]/10 transition-colors">
              <Eye size={14} />
              View Dashboard
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2.5 border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              <ClipboardList size={14} />
              New Assignment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
