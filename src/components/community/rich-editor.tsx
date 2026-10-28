"use client";
// 글쓰기 본문 에디터(tiptap). 굵게, 기울임, 취소선, 제목 둘, 목록 둘, 인용, 코드, 링크, 그림. 결과는 HTML 이다(lib/community/rich-text).
//
// 왜 tiptap 인가: contentEditable 에 execCommand 를 얹는 길은 브라우저마다 내놓는 HTML 이 달라(크롬 div, 파이어폭스 br)
// 걸러 내는 규칙이 끝없이 늘어난다. tiptap 은 문서 모델(ProseMirror)이 정한 태그만 내놓아 허용 목록과 1:1 로 맞는다.
// 이 파일은 글쓰기 화면에서만 읽힌다 — 목록, 상세 번들에는 안 실린다.
//
// 그림은 단추, 붙여 넣기, 끌어다 놓기 셋 다 받는다. 올리는 동안 칸 아래에 "올리는 중" 을 띄우고, 다 올라가면 커서 자리에 꽂는다.
// 링크 주소는 브라우저 prompt 가 아니라 툴바 밑 한 줄 입력으로 받는다(브라우저 대화상자는 화면을 멈추고 모바일에서 어색하다).
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";
import { uploadPostImage } from "@/components/community/post-media";
import { Button } from "@/components/ui/button";
import { SpinnerIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { isPostImageName, POST_IMAGE_ACCEPT, POST_IMAGE_MAX } from "@/lib/community/media";
import { COMMUNITY_MESSAGES as M } from "@/lib/community/messages";
import { ToolIcon, type ToolIconName } from "./rich-editor-icons";

type Props = {
  id: string;
  onChange: (html: string, textLength: number) => void;
  /** 올리는 중인 그림 수가 바뀔 때 — 폼이 그동안 등록을 막는다 */
  onBusyChange: (busy: boolean) => void;
  onError: (message: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

function countImages(editor: Editor): number {
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image") n += 1;
  });
  return n;
}

export function RichEditor({ id, onChange, onBusyChange, onError, invalid, describedBy }: Props) {
  const [uploading, setUploading] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  // 그림 고르기 창. ref 가 아니라 상태로 쥔다 — 툴바 단추 표가 렌더 중에 만들어져 ref 를 읽으면 린트가 막는다
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const busyRef = useRef(0);

  const insertImages = async (files: File[]) => {
    const editor = editorRef.current;
    if (!editor) return;
    const images = files.filter((f) => isPostImageName(f.name) || f.type.startsWith("image/"));
    if (images.length === 0) return;
    const room = POST_IMAGE_MAX - countImages(editor);
    if (room <= 0) return onError(M.imageLimit(POST_IMAGE_MAX));
    const take = images.slice(0, room);
    if (take.length < images.length) onError(M.imageLimit(POST_IMAGE_MAX));
    const bump = (d: number) => {
      busyRef.current += d;
      setUploading(busyRef.current);
      onBusyChange(busyRef.current > 0);
    };
    bump(take.length);
    // 한 장씩 차례로 — 붙여 넣은 순서대로 본문에 서야 한다
    for (const f of take) {
      try {
        const img = await uploadPostImage(f);
        editor.chain().focus().setImage({ src: img.url, alt: "" }).run();
      } catch (e) {
        onError(e instanceof Error && e.message ? e.message : M.uploadFailed);
      } finally {
        bump(-1);
      }
    }
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["http", "https", "mailto"] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: M.bodyPlaceholder }),
    ],
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": M.bodyLabel,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: "post-body rich-editor-area",
      },
      // 붙여 넣은 그림, 끌어다 놓은 그림은 base64 로 박히지 않게 가로채 올린다
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length === 0) return false;
        void insertImages(files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (files.length === 0) return false;
        event.preventDefault();
        void insertImages(files);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText().trim().length),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            code: e.isActive("codeBlock"),
            link: e.isActive("link"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });

  const run = (fn: (e: Editor) => void) => () => {
    if (editor) fn(editor);
  };

  const openLink = () => {
    if (!editor) return;
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setLinkOpen((v) => !v);
  };
  const applyLink = () => {
    if (!editor) return;
    const url = linkUrl.trim();
    const href = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    // 고른 글자가 없으면 주소를 글자로 넣는다 — 빈 커서에 링크만 걸면 아무것도 안 생겨 단추가 고장 난 것처럼 보인다
    else if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href } }] }).run();
    else chain.setLink({ href }).run();
    setLinkOpen(false);
  };

  const tools: { key: string; icon: ToolIconName; label: string; on?: boolean; disabled?: boolean; act: () => void }[][] = [
    [
      { key: "h2", icon: "h2", label: M.toolHeading, on: state?.h2, act: run((e) => e.chain().focus().toggleHeading({ level: 2 }).run()) },
      { key: "h3", icon: "h3", label: M.toolSubheading, on: state?.h3, act: run((e) => e.chain().focus().toggleHeading({ level: 3 }).run()) },
    ],
    [
      { key: "bold", icon: "bold", label: M.toolBold, on: state?.bold, act: run((e) => e.chain().focus().toggleBold().run()) },
      { key: "italic", icon: "italic", label: M.toolItalic, on: state?.italic, act: run((e) => e.chain().focus().toggleItalic().run()) },
      { key: "strike", icon: "strike", label: M.toolStrike, on: state?.strike, act: run((e) => e.chain().focus().toggleStrike().run()) },
    ],
    [
      { key: "bullet", icon: "bullet", label: M.toolBullet, on: state?.bullet, act: run((e) => e.chain().focus().toggleBulletList().run()) },
      { key: "ordered", icon: "ordered", label: M.toolOrdered, on: state?.ordered, act: run((e) => e.chain().focus().toggleOrderedList().run()) },
      { key: "quote", icon: "quote", label: M.toolQuote, on: state?.quote, act: run((e) => e.chain().focus().toggleBlockquote().run()) },
      { key: "code", icon: "code", label: M.toolCode, on: state?.code, act: run((e) => e.chain().focus().toggleCodeBlock().run()) },
    ],
    [
      { key: "link", icon: "link", label: M.toolLink, on: state?.link || linkOpen, act: openLink },
      { key: "image", icon: "image", label: M.toolImage, act: () => fileInput?.click() },
    ],
    [
      { key: "undo", icon: "undo", label: M.toolUndo, disabled: !state?.canUndo, act: run((e) => e.chain().focus().undo().run()) },
      { key: "redo", icon: "redo", label: M.toolRedo, disabled: !state?.canRedo, act: run((e) => e.chain().focus().redo().run()) },
    ],
  ];

  return (
    <div className={cn("rich-editor overflow-clip rounded-xl bg-surface transition-[box-shadow] duration-base ease-standard",
        // 입력칸(ui/text-field)과 같은 테두리, 같은 초점 빛 — 제목 칸과 본문 칸이 한 폼으로 읽혀야 한다
        invalid ? "shadow-[0_0_0_1px_var(--danger)]" : "shadow-[0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_1px_var(--acc),0_0_0_4px_var(--acc-glow)]")}>
      <div role="toolbar" aria-label={M.toolbarLabel} aria-controls={id} className="sticky top-[var(--header-h)] z-[2] flex items-center gap-1 overflow-x-auto border-b border-line-soft bg-surface px-2 py-1.5 [scrollbar-width:none]">
        {tools.map((group, gi) => (
          <div key={gi} className={cn("flex shrink-0 items-center gap-0.5", gi > 0 && "border-l border-line-soft pl-1")}>
            {group.map((t) => (
              <button
                key={t.key}
                type="button"
                aria-label={t.label}
                aria-pressed={t.on === undefined ? undefined : Boolean(t.on)}
                disabled={!editor || t.disabled}
                // 단추를 눌러도 본문 선택이 풀리지 않게 — 포커스가 단추로 넘어가면 굵게가 빈 커서에 걸린다
                onMouseDown={(e) => e.preventDefault()}
                onClick={t.act}
                className={cn(
                  "press flex size-11 items-center justify-center rounded-lg transition-colors disabled:opacity-35 sm:size-9",
                  t.on ? "bg-acc-soft text-acc" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <ToolIcon name={t.icon} />
              </button>
            ))}
          </div>
        ))}
      </div>
      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-line-soft bg-surface-4 px-3 py-2">
          <label htmlFor={`${id}-link`} className="sr-only">
            {M.linkPrompt}
          </label>
          <input
            id={`${id}-link`}
            type="url"
            inputMode="url"
            autoFocus
            value={linkUrl}
            placeholder="https://"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            className="h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-[16px] text-ink outline-none focus:border-acc"
          />
          <Button type="button" size="sm" onClick={applyLink}>
            {M.linkApply}
          </Button>
          {state?.link && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkOpen(false);
              }}
            >
              {M.linkRemove}
            </Button>
          )}
        </div>
      )}
      <EditorContent editor={editor} className="min-h-[320px] cursor-text" onClick={() => editor?.commands.focus()} />
      {uploading > 0 && (
        <p role="status" className="flex items-center gap-2 border-t border-line-soft px-4 py-2 text-[12.5px] text-mut">
          <SpinnerIcon size={14} className="animate-spin" />
          {M.uploading} ({uploading})
        </p>
      )}
      <input
        ref={setFileInput}
        type="file"
        accept={POST_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void insertImages(files);
        }}
      />
    </div>
  );
}
