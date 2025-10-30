// src/components/dashboard/DashboardNotice.tsx
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import GroupPagination from '../common/GroupPagination';
import { supabase } from '../../lib/supabase';
import GroupContentDetailEdit from './GroupContentDetailEdit';
import type { Notice } from '../../types/notice';
import LoadingSpinner from '../common/LoadingSpinner';

const ITEMS_PER_PAGE = 10;
const BUCKET = 'group-post-images';
const PREFIX = 'notice';
const today = () => new Date().toISOString().slice(0, 10);

type NoticeRow = Notice & {
  post_id: string;
};

const isHttp = (u?: string | null) => !!u && /^https?:\/\//i.test(u);
const isPublicPath = (u?: string | null) => !!u && /\/storage\/v1\/object\/public\//i.test(u);

const buildKey = (groupId: string, filename: string) => {
  const ts = Date.now();
  const ext = (filename.split('.').pop() || 'png').toLowerCase();
  const uuid = (
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${ts}`
  ) as string;
  return `${PREFIX}/${groupId}/${ts}-${uuid}.${ext}`;
};

const resolvePostImageUrl = (raw?: string | null, groupId?: string | null): string | null => {
  if (!raw) return null;
  if (isHttp(raw) || isPublicPath(raw)) return raw;
  let key = raw.replace(/^\/+/, '');
  if (groupId && !key.startsWith(`${PREFIX}/${groupId}/`)) {
    if (key.startsWith(`${groupId}/`)) key = `${PREFIX}/${key}`;
    else key = `${PREFIX}/${groupId}/${key}`;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return data?.publicUrl ?? null;
};

const resolveAllImageSrcInHtml = (html?: string | null, groupId?: string | null): string => {
  if (!html) return '';
  return html.replace(/<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi, (_m, pre, src, post) => {
    const resolved = resolvePostImageUrl(src, groupId) || src;
    return `<img${pre}src="${resolved}"${post}>`;
  });
};

async function externalizeInlineImages(html: string, groupId: string): Promise<string> {
  const matches = Array.from(
    html.matchAll(/<img\b[^>]*\bsrc=["'](data:image\/[^"']+)["'][^>]*>/gi),
  );
  if (matches.length === 0) return html;

  let out = html;
  for (const m of matches) {
    const dataUrl = m[1] as string;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const mime = blob.type || 'image/png';
      const ext = mime.split('/')[1] || 'png';
      const key = buildKey(groupId, `inline.${ext}`);

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, blob, {
        upsert: false,
        cacheControl: '3600',
        contentType: mime,
      });
      if (upErr) continue;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
      if (data?.publicUrl) out = out.replace(dataUrl, data.publicUrl);
    } catch {
      // skip
    }
  }
  return out;
}

export function DashboardNotice({
  groupId,
  boardType = 'notice',
  createRequestKey = 0,
  onCraftingChange,
}: {
  groupId?: string;
  boardType?: string;
  createRequestKey?: number;
  onCraftingChange?: (v: boolean) => void;
}) {
  const [isHost, setIsHost] = useState(false);
  const [creating, setCreating] = useState(false);
  const prevKey = useRef(createRequestKey);

  const [items, setItems] = useState<NoticeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id;
      if (!groupId || !userId) {
        if (!ignore) setIsHost(false);
        return;
      }
      const { data } = await supabase
        .from('group_members')
        .select('member_role')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!ignore) setIsHost(String(data?.member_role ?? '').toLowerCase() === 'host');
    })();
    return () => {
      ignore = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (createRequestKey > prevKey.current && isHost) setCreating(true);
    prevKey.current = createRequestKey;
  }, [createRequestKey, isHost]);

  useEffect(() => {
    onCraftingChange?.(creating);
  }, [creating, onCraftingChange]);

  const reload = async (): Promise<NoticeRow[]> => {
    if (!groupId) return [];
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u?.user?.id ?? null;
      setMyUserId(userId);

      const { data: posts, error: postsErr } = await supabase
        .from('group_posts')
        .select('post_id, post_title, post_body_md, post_created_at, view_count')
        .eq('group_id', groupId)
        .eq('board_type', boardType)
        .order('post_created_at', { ascending: false });
      if (postsErr) throw postsErr;

      let readSet = new Set<string>();
      if (userId && posts?.length) {
        const ids = posts.map(p => p.post_id);
        const { data: reads } = await supabase
          .from('group_post_reads')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', ids);
        if (reads?.length) readSet = new Set(reads.map(r => r.post_id as string));
      }

      const mapped: NoticeRow[] =
        (posts ?? []).map((r, i) => ({
          id: i + 1,
          post_id: r.post_id,
          title: r.post_title ?? '',
          content: resolveAllImageSrcInHtml(r.post_body_md ?? '', groupId),
          date: (r.post_created_at ?? '').slice(0, 10),
          isRead: readSet.has(r.post_id),
          views: Number(r.view_count ?? 0),
        })) ?? [];

      setItems(mapped);
      return mapped;
    } catch (e) {
      console.error('reload error', e);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [groupId, boardType]);

  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [items.length]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE)),
    [items.length],
  );
  const pageItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [page, items]);

  const [detailIdx, setDetailIdx] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);

  const openDetail = async (localId: number) => {
    const idx = items.findIndex(n => n.id === localId);
    if (idx < 0) return;

    const t = items[idx];
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;

    if (groupId && userId && t?.post_id) {
      const wasRead = t.isRead;
      const base = supabase
        .from('group_post_reads')
        .upsert(
          { post_id: t.post_id, user_id: userId },
          { onConflict: 'post_id,user_id', ignoreDuplicates: true },
        );
      const { data: inserted, error: insErr } = await base.select('post_id');
      if (!wasRead && inserted && inserted.length > 0) {
        setItems(prev =>
          prev.map((cur, i) =>
            i === idx ? { ...cur, isRead: true, views: (cur.views ?? 0) + 1 } : cur,
          ),
        );
      } else {
        setItems(prev => prev.map((cur, i) => (i === idx ? { ...cur, isRead: true } : cur)));
      }
      if (insErr && (insErr as any).code !== '23505') console.error('insert read error', insErr);
    }

    setDetailIdx(idx);
    setEditing(false);
    setCreating(false);
  };

  const closeDetail = () => {
    setDetailIdx(null);
    setEditing(false);
    setCreating(false);
  };

  const handleCreateSave = async (next: Notice) => {
    if (!groupId || !isHost) return;
    const { data: u } = await supabase.auth.getUser();
    const userId = u?.user?.id;
    if (!userId) return;

    const cleanedHtml = await externalizeInlineImages(next.content || '', groupId);
    const normalizedHtml = resolveAllImageSrcInHtml(cleanedHtml, groupId);

    const { data: ins, error } = await supabase
      .from('group_posts')
      .insert({
        user_id: userId,
        group_id: groupId,
        board_type: boardType,
        post_title: next.title,
        post_body_md: normalizedHtml,
      })
      .select('post_id')
      .single();

    if (error || !ins) {
      console.error('create error', error);
      return;
    }

    const list = await reload();
    if (!list.length) {
      setCreating(false);
      setPage(1);
      setDetailIdx(null);
      setEditing(false);
      return;
    }

    const first = list[0];
    setPage(1);
    setCreating(false);

    const base = supabase
      .from('group_post_reads')
      .upsert(
        { post_id: first.post_id, user_id: userId },
        { onConflict: 'post_id,user_id', ignoreDuplicates: true },
      );
    const { data: inserted, error: insErr } = await base.select('post_id');
    if (insErr && (insErr as any).code !== '23505') console.error('insert read error', insErr);

    if (inserted && inserted.length > 0) {
      setItems(prev =>
        prev.map(cur =>
          cur.post_id === first.post_id
            ? { ...cur, isRead: true, views: (cur.views ?? 0) + 1 }
            : cur,
        ),
      );
    } else {
      setItems(prev =>
        prev.map(cur => (cur.post_id === first.post_id ? { ...cur, isRead: true } : cur)),
      );
    }

    setDetailIdx(first.id - 1);
    setEditing(false);
  };

  const handleDetailSave = async (next: Notice) => {
    if (detailIdx == null || !groupId) return;
    const target = items[detailIdx];
    if (!target) return;

    const cleanedHtml = await externalizeInlineImages(next.content || '', groupId);
    const normalizedHtml = resolveAllImageSrcInHtml(cleanedHtml, groupId);

    const { error } = await supabase
      .from('group_posts')
      .update({ post_title: next.title, post_body_md: normalizedHtml })
      .eq('post_id', target.post_id);
    if (error) {
      console.error('update error', error);
      return;
    }

    setItems(prev =>
      prev.map((cur, i) =>
        i === detailIdx ? { ...cur, title: next.title, content: normalizedHtml } : cur,
      ),
    );
    setEditing(false);
    setCreating(false);
  };

  const handleDetailDelete = async () => {
    if (detailIdx == null) return;
    const target = items[detailIdx];
    if (!target) return;
    if (!window.confirm('삭제할까요?')) return;

    const { error } = await supabase.from('group_posts').delete().eq('post_id', target.post_id);
    if (error) {
      console.error('delete error', error);
      return;
    }

    const rest = items.filter((_, i) => i !== detailIdx).map((r, i) => ({ ...r, id: i + 1 }));
    setItems(rest);
    setDetailIdx(null);
    setEditing(false);
    setCreating(false);
  };

  const current = detailIdx != null ? items[detailIdx] : null;

  return (
    <div className="w-[975px] bg-white overflow-hidden">
      <AnimatePresence mode="wait">
        {creating ? (
          <motion.div
            key="notice-create"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <GroupContentDetailEdit
              notice={{ id: 0, title: '', content: '', date: today(), isRead: false, views: 0 }}
              onCancel={() => setCreating(false)}
              onSave={handleCreateSave}
            />
          </motion.div>
        ) : detailIdx == null ? (
          <motion.div
            key="notice-list"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {loading ? (
              <div className="py-16">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-gray-500">등록된 공지가 없습니다.</div>
            ) : (
              <>
                <div className="flex justify-between items-center py-2 bg-[#F4F4F4] border-b border-b-[#A3A3A3] text-[#808080]">
                  <div className="w-[600px] truncate font-semibold pl-7 text-md">제목</div>
                  <div className="w-[120px] text-center text-md">작성일자</div>
                  <div className="w-[80px] text-center text-md">조회수</div>
                  {!isHost && <div className="w-[50px] text-center mr-7 text-sm">상태</div>}
                </div>

                <div className="flex flex-col divide-y divide-dashed divide-gray-300">
                  {pageItems.map(n => (
                    <div
                      key={n.post_id}
                      className="flex justify-between items-center py-3 hover:bg-gray-50 text-left"
                    >
                      <button
                        type="button"
                        onClick={() => openDetail(n.id)}
                        className="w-[600px] truncate font-semibold pl-7 text-[#111] text-left focus:outline-none"
                        title={n.title}
                      >
                        {n.title}
                      </button>

                      <span className="w-[120px] text-center text-gray-400 text-sm">{n.date}</span>
                      <span className="w-[80px] text-center text-gray-400 text-sm">
                        {n.views ?? 0}
                      </span>

                      {!isHost && (
                        <span
                          className={`w-[50px] py-1 rounded-full font-semibold text-white text-sm flex items-center justify-center mr-7 leading-4 ${
                            n.isRead ? 'bg-[#C4C4C4]' : 'bg-[#FF5252]'
                          }`}
                        >
                          {n.isRead ? '읽음' : '안읽음'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <hr className="border-0 border-b border-[#A3A3A3]" />

                <GroupPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </>
            )}
          </motion.div>
        ) : editing ? (
          <motion.div
            key="notice-edit"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {current && (
              <GroupContentDetailEdit
                notice={current}
                onCancel={() => setEditing(false)}
                onSave={handleDetailSave}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="notice-detail"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <article className="mx-auto bg-white shadow-md border border-[#A3A3A3] min-h-[450px]">
              <header className="px-8 pt-6">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-800 leading-none">{current?.title}</h1>
                  {!isHost && (
                    <span
                      className={`w-[50px] py-1 rounded-full font-semibold text-white text-sm flex items-center justify-center leading-4 ${
                        current?.isRead ? 'bg-[#C4C4C4]' : 'bg-[#FF5252]'
                      }`}
                    >
                      {current?.isRead ? '읽음' : '안읽음'}
                    </span>
                  )}
                </div>

                <div className="flex items-center text-[#8C8C8C] text-sm gap-3">
                  <span>{current?.date}</span>
                  <span>조회수 {current?.views ?? 0}</span>
                </div>
              </header>

              <div className="text-center">
                <div className="inline-block border-b border-[#A3A3A3] w-[910px]" />
              </div>

              <section className="px-8 py-10 text-gray-800 leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{ __html: current?.content || '' }}
                  className="prose max-w-none ql-editor"
                  style={{ padding: 0 }}
                />
              </section>
            </article>

            <footer className="pt-6 flex text-left justify-start">
              <button onClick={closeDetail} className="text-[#8C8C8C] py-2 text-md">
                &lt; 목록으로
              </button>

              {(boardType !== 'notice' || isHost) && (
                <div className="ml-auto flex py-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    className="text-md w-[50px] h-[32px] flex justify-center items-center text-center mr-4 text-[#0689E8] border border-[#0689E8] rounded-sm"
                    onClick={handleDetailDelete}
                  >
                    삭제
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    className="text-md w-[50px] h-[32px] flex justify-center items-center text-center text-white bg-[#0689E8] border border-[#0689E8] rounded-sm"
                    onClick={() => setEditing(true)}
                  >
                    수정
                  </motion.button>
                </div>
              )}
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardNotice;
