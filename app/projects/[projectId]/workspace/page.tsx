// app/projects/[projectId]/workspace/page.tsx
// 创作空间 - 核心工作台（聊天界面 + 上下文面板）

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  Loader2,
  PanelRightOpen,
  PanelRightClose,
  Pin,
  PinOff,
  Trash2,
  Sparkles,
  Square,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { toast } from "@/hooks/use-toast";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";

/** 世界状态提取标记 */
// 不使用 $ 锚定：AI 可能在标记块后附加文字（如结尾语），锚定会导致两个正则都不匹配
const WS_MARKER_RE = /\s*<<WORLD_STATE_START>>[\s\S]*?<<WORLD_STATE_END>>\s*/;
// 流式输出中未闭合的标记（正在输出世界状态时，END 标记尚未出现）
const WS_MARKER_PARTIAL_RE = /\s*<<WORLD_STATE_START>>(?![\s\S]*<<WORLD_STATE_END>>)[\s\S]*$/;

/** 剥离 AI 输出中的世界状态标记，返回用户可见的干净文本 */
function stripWorldStateMarkers(text: string): string {
  if (!text) return text;
  // 先移除完整的标记块
  let cleaned = text.replace(WS_MARKER_RE, "");
  // 再移除流式输出中未闭合的标记（正在输出世界状态时）
  cleaned = cleaned.replace(WS_MARKER_PARTIAL_RE, "");
  return cleaned.trimEnd();
}

/** 消息类型 */
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isPinned: boolean;
  createdAt: string;
}

/** 世界状态 */
interface WorldStateItem {
  id: string;
  key: string;
  value: string;
  description: string;
}

export default function WorkspacePage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { modelConfig } = useSettingsStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [worldStates, setWorldStates] = useState<WorldStateItem[]>([]);

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  /** 记录当前正在流式输出的 AI 消息 ID */
  const streamingMsgIdRef = useRef<string | null>(null);
  /** 标记是否正在删除消息（阻止 AbortError 处理器重新保存） */
  const isDeletingRef = useRef(false);
  /** Streamdown 容器 ref，用于注入光标 */
  const cursorContainerRef = useRef<HTMLDivElement | null>(null);
  /** 是否有光标在 DOM 中（防止 MutationObserver 自触发） */
  const hasCursorRef = useRef(false);

  /** 滚动到底部 */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /** 加载消息历史 */
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/messages?limit=100`);
      const data = await res.json();
      if (data.success) {
        // 清理旧数据中可能残留的世界状态标记
        const cleaned = (data.data.items as Message[]).map((m) =>
          m.role === "assistant" ? { ...m, content: stripWorldStateMarkers(m.content) } : m
        );
        setMessages(cleaned);
      }
    } catch (err) {
      console.error("加载消息失败:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /** 加载世界状态 */
  const loadWorldStates = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/world-state`);
      const data = await res.json();
      if (data.success) {
        setWorldStates(data.data);
      }
    } catch (err) {
      console.error("加载世界状态失败:", err);
    }
  }, [projectId]);

  useEffect(() => {
    loadMessages();
    loadWorldStates();
  }, [loadMessages, loadWorldStates]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * 流式输出光标注入：
   * Streamdown 把内容渲染为多个 <p> block，CSS ::after 只能跟在所有 block 之后（新一行）。
   * 用 MutationObserver 把光标 <span> 注入到最后一个 block 的最后一个文本节点内，
   * 这样光标就紧跟在最后一个字后面，不会换行。
   */
  const cursorMsgId = isStreaming ? messages[messages.length - 1]?.id : null;
  const cursorIsStreaming = isStreaming;

  useEffect(() => {
    const container = cursorContainerRef.current;
    if (!cursorMsgId || !cursorIsStreaming || !container) return;

    const CURSOR_CLASS = "streamdown-cursor";

    function injectCursor() {
      if (!container) return;
      // 清理旧光标
      container.querySelectorAll(`.${CURSOR_CLASS}`).forEach((el) => el.remove());
      hasCursorRef.current = false;

      // 找到最后一个元素节点（Streamdown 渲染的 <p> 等）
      const children = Array.from(container.children);
      const lastEl = children[children.length - 1];
      if (!lastEl) return;

      // 创建光标元素
      const cursor = document.createElement("span");
      cursor.className = CURSOR_CLASS;
      cursor.textContent = "█";

      // 找到最后一个文本节点，在其末尾插入光标
      const walker = document.createTreeWalker(lastEl, NodeFilter.SHOW_TEXT);
      let lastTextNode: Text | null = null;
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        lastTextNode = node;
      }

      if (lastTextNode) {
        lastTextNode.parentNode?.insertBefore(cursor, lastTextNode.nextSibling);
      } else {
        lastEl.appendChild(cursor);
      }
      hasCursorRef.current = true;
    }

    injectCursor();

    // 监听 Streamdown 内容变化，重新注入光标
    const observer = new MutationObserver(() => {
      if (hasCursorRef.current) {
        hasCursorRef.current = false;
        return; // 光标刚被注入，跳过本次回调避免无限循环
      }
      injectCursor();
    });
    observer.observe(container, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      container.querySelectorAll(`.${CURSOR_CLASS}`).forEach((el) => el.remove());
      hasCursorRef.current = false;
    };
  }, [cursorMsgId, cursorIsStreaming]);

  /** 停止生成 */
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  /** 删除消息 */
  const handleDelete = async (msgId: string) => {
    if (!confirm("确定要删除这条消息吗？")) return;

    // 如果正在流式输出且要删除的是当前流式消息，先标记再中止
    if (isStreaming && streamingMsgIdRef.current === msgId) {
      isDeletingRef.current = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // 等待流式输出完全结束
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!isStreaming) resolve();
          else setTimeout(check, 50);
        };
        check();
      });
    }

    // 立即从 UI 移除
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    toast({ title: "消息已删除" });

    // 临时 ID（ai-xxx）不在数据库中，无需调 API
    if (msgId.startsWith("ai-")) return;

    // 静默尝试从数据库删除
    try {
      await fetch(`/api/projects/${projectId}/messages/${msgId}`, {
        method: "DELETE",
      });
    } catch {
      // 忽略错误，UI 已移除
    }
  };

  /** 开始编辑消息 */
  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  /** 取消编辑 */
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  /** 保存编辑 */
  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/messages/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingId ? { ...m, content: editContent.trim() } : m
          )
        );
        setEditingId(null);
        setEditContent("");
        toast({ title: "消息已更新" });
      }
    } catch (err) {
      console.error("更新消息失败:", err);
      toast({ title: "更新失败", variant: "destructive" });
    }
  };

  /** 保存消息到数据库（剥离世界状态标记），静默失败不阻塞调用方 */
  const saveMessage = async (role: "user" | "assistant", rawContent: string) => {
    const content = role === "assistant" ? stripWorldStateMarkers(rawContent) : rawContent;
    if (!content) return;
    try {
      await fetch(`/api/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      });
    } catch (err) {
      console.error(`保存${role === "user" ? "用户" : "AI"}消息失败:`, err);
    }
  };

  /** 发送消息 */
  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setInput("");

    // 乐观添加用户消息
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // 保存用户消息到数据库
    await saveMessage("user", content);

    // 创建 AI 回复占位
    const aiMsgId = `ai-${Date.now()}`;
    streamingMsgIdRef.current = aiMsgId;
    const aiMsg: Message = {
      id: aiMsgId,
      role: "assistant",
      content: "",
      isPinned: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsStreaming(true);

    // 创建 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // 流式请求
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          projectId,
          modelConfig,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "请求失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            // 剥离标记后存入 state，避免标记泄露到编辑框、置顶面板和下次对话上下文
            const cleanChunk = stripWorldStateMarkers(fullContent);
            setMessages((prev) => {
              if (!prev.some((m) => m.id === aiMsgId)) return prev;
              return prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: cleanChunk } : m
              );
            });
          }
        } finally {
          // 刷新 TextDecoder 缓冲的尾部多字节字节，无论正常结束还是中止都执行
          fullContent += decoder.decode();
          // 最终更新 state（含 decoder.flush 的尾部字节）
          const cleanContent = stripWorldStateMarkers(fullContent);
          setMessages((prev) => {
            if (!prev.some((m) => m.id === aiMsgId)) return prev;
            return prev.map((m) =>
              m.id === aiMsgId ? { ...m, content: cleanContent } : m
            );
          });
        }
      }

      // 保存到数据库（fullContent 含原始标记，saveMessage 内部会剥离）
      if (fullContent) {
        await saveMessage("assistant", fullContent);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // 如果是删除操作触发的中止，不保存内容（消息已被删除）
        if (isDeletingRef.current) {
          isDeletingRef.current = false;
        } else {
          // 用户手动停止生成，保存已生成的内容（state 中已是干净文本）
          let savedContent = "";
          setMessages((prev) => {
            const msg = prev.find((m) => m.id === aiMsgId);
            savedContent = msg?.content || "";
            return prev;
          });
          if (savedContent) {
            await saveMessage("assistant", savedContent);
          }
        }
      } else {
        console.error("AI 回复失败:", err);
        const errorMsg = err instanceof Error ? err.message : "回复失败，请检查模型配置是否正确。";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId ? { ...m, content: `❌ ${errorMsg}` } : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      streamingMsgIdRef.current = null;
      isDeletingRef.current = false;
      // 延迟刷新世界状态面板（等待后端异步提取完成）
      setTimeout(() => loadWorldStates(), 2000);
    }
  };

  /** 切换消息置顶 */
  const togglePin = async (msg: Message) => {
    try {
      await fetch(`/api/projects/${projectId}/messages/${msg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !msg.isPinned }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, isPinned: !m.isPinned } : m
        )
      );
    } catch (err) {
      console.error("置顶失败:", err);
    }
  };

  /** 键盘快捷键 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full">
      {/* 主聊天区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                开始你的创作之旅
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                在下方输入框中输入文字，AI 将帮你续写故事、扮演角色或描述场景。
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 group",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-3 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-muted",
                    msg.isPinned && "ring-2 ring-primary/30"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        AI
                      </span>
                      {msg.isPinned && (
                        <Badge variant="secondary" className="text-xs py-0">
                          已置顶
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* 编辑模式 */}
                  {editingId === msg.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        <Button size="sm" onClick={saveEdit} className="h-7 gap-1">
                          <Check className="h-3 w-3" />
                          保存
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-7 gap-1">
                          <X className="h-3 w-3" />
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap break-words">
                        {msg.role === "assistant" ? (
                          msg.content ? (
                            <div ref={isStreaming && msg.id === messages[messages.length - 1]?.id ? cursorContainerRef : undefined}>
                              <Streamdown
                                animated
                                isAnimating={isStreaming && msg.id === messages[messages.length - 1]?.id}
                              >
                                {msg.content}
                              </Streamdown>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              思考中...
                            </span>
                          )
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* 操作按钮 */}
                      {msg.content && !isStreaming && (
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => startEdit(msg)}
                            title="编辑消息"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePin(msg)}
                            title={msg.isPinned ? "取消置顶" : "置顶（注入上下文）"}
                          >
                            {msg.isPinned ? (
                              <PinOff className="h-3 w-3" />
                            ) : (
                              <Pin className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(msg.id)}
                            title="删除消息"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-border p-4 md:p-6">
          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息...（Shift+Enter 换行，Enter 发送）"
              rows={2}
              className="resize-none"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button
                onClick={handleStop}
                size="icon"
                variant="destructive"
                className="h-[76px] w-12 shrink-0"
                title="停止生成"
              >
                <Square className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="h-[76px] w-12 shrink-0"
              >
                <Send className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 右侧上下文面板 */}
      {panelOpen && (
        <aside className="hidden lg:block w-80 border-l border-border overflow-y-auto bg-muted/30">
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              上下文面板
            </h3>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">世界状态</CardTitle>
              </CardHeader>
              <CardContent>
                {worldStates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">暂无世界状态变量</p>
                ) : (
                  <div className="space-y-2">
                    {worldStates.map((s) => (
                      <div key={s.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{s.key}</span>
                        <span className="font-medium">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">置顶信息</CardTitle>
              </CardHeader>
              <CardContent>
                {messages.filter((m) => m.isPinned).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    悬停消息点击 📌 可置顶重要信息
                  </p>
                ) : (
                  <div className="space-y-2">
                    {messages
                      .filter((m) => m.isPinned)
                      .map((m) => (
                        <p key={m.id} className="text-xs text-muted-foreground line-clamp-3">
                          {m.content}
                        </p>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">快捷指令</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p><code>/describe</code> - 让 AI 描写环境</p>
                  <p><code>/roll</code> - 掷骰子</p>
                  <p><code>/npc</code> - NPC 互动</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex fixed right-4 top-16 z-10"
        onClick={() => setPanelOpen(!panelOpen)}
      >
        {panelOpen ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
