"use client";

import { useEffect, useRef } from "react";
import type QuillType from "quill";

/**
 * Trình soạn thảo trực quan (như Word) — người dùng không cần biết HTML.
 * Nội dung được đồng bộ vào input ẩn `name` để submit cùng form.
 */
export default function RichText({
  name,
  defaultValue = "",
  placeholder = "Viết nội dung ở đây... Bôi đen chữ để định dạng, dùng nút trên thanh công cụ để chèn ảnh.",
  minHeight = 320,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: number;
}) {
  const holderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<QuillType | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    if (quillRef.current || !holderRef.current) return;

    (async () => {
      const [{ default: Quill }, { default: QuillTableBetter }] = await Promise.all([
        import("quill"),
        import("quill-table-better"),
      ]);
      if (!mounted || !holderRef.current || quillRef.current) return;
      Quill.register({ "modules/table-better": QuillTableBetter }, true);

      const quill = new Quill(holderRef.current, {
        theme: "snow",
        placeholder,
        modules: {
          table: false,
          "table-better": {
            menus: ["column", "row", "merge", "table", "cell", "wrap", "copy", "delete"],
            toolbarTable: true,
            // menu bảng bằng tiếng Việt cho người dùng không rành kỹ thuật
            language: {
              name: "vi_VN",
              content: {
                col: "Cột", insColL: "Chèn cột bên trái", insColR: "Chèn cột bên phải",
                delCol: "Xoá cột", selCol: "Chọn cột",
                row: "Hàng", headerRow: "Hàng tiêu đề", insRowAbv: "Chèn hàng phía trên",
                insRowBlw: "Chèn hàng phía dưới", delRow: "Xoá hàng", selRow: "Chọn hàng",
                mCells: "Gộp ô", sCell: "Tách ô", tblProps: "Thuộc tính bảng", cellProps: "Thuộc tính ô",
                insParaOTbl: "Chèn đoạn văn ngoài bảng", insB4: "Chèn phía trước", insAft: "Chèn phía sau",
                copyTable: "Sao chép bảng", delTable: "Xoá bảng",
                border: "Viền", color: "Màu", width: "Rộng", background: "Nền",
                dims: "Kích thước", height: "Cao", padding: "Khoảng đệm",
                tblCellTxtAlm: "Căn chữ trong ô", alCellTxtL: "Căn trái", alCellTxtC: "Căn giữa",
                alCellTxtR: "Căn phải", jusfCellTxt: "Căn đều", alCellTxtT: "Căn trên",
                alCellTxtM: "Căn giữa theo chiều dọc", alCellTxtB: "Căn dưới",
                dimsAlm: "Kích thước và căn lề", alTblL: "Căn bảng sang trái",
                tblC: "Căn bảng vào giữa", alTblR: "Căn bảng sang phải",
                save: "Lưu", cancel: "Huỷ",
                colorMsg: 'Mã màu chưa đúng. Thử "#FF0000" hoặc "rgb(255,0,0)".',
                dimsMsg: 'Giá trị chưa đúng. Thử "10px" hoặc "50%".',
                colorPicker: "Chọn màu", removeColor: "Bỏ màu",
                black: "Đen", dimGrey: "Xám đậm", grey: "Xám", lightGrey: "Xám nhạt", white: "Trắng",
                red: "Đỏ", orange: "Cam", yellow: "Vàng", lightGreen: "Xanh lá nhạt", green: "Xanh lá",
                aquamarine: "Xanh ngọc", turquoise: "Lam ngọc", lightBlue: "Xanh dương nhạt",
                blue: "Xanh dương", purple: "Tím",
              },
            },
          },
          keyboard: { bindings: QuillTableBetter.keyboardBindings },
          toolbar: {
            container: [
              [{ header: [2, 3, false] }],
              ["bold", "italic", "underline"],
              [{ color: [] }, { background: [] }],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ align: [] }],
              ["link", "image", "table-better"],
              ["clean"],
            ],
            handlers: {
              // nút ảnh: chọn file từ máy -> upload -> chèn vào bài
              image() {
                const picker = document.createElement("input");
                picker.type = "file";
                picker.accept = "image/jpeg,image/png,image/webp,image/gif";
                picker.onchange = async () => {
                  const file = picker.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  try {
                    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
                    const d = await res.json();
                    if (!d.ok) return alert(d.error || "Upload thất bại");
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, "image", d.url);
                    quill.setSelection(range.index + 1);
                  } catch {
                    alert("Không upload được ảnh, thử lại nhé");
                  }
                };
                picker.click();
              },
            },
          },
        },
      });

      if (defaultValue) {
        // Nạp nội dung có sẵn: PHẢI dùng convert + updateContents để bảng
        // (quill-table-better) dựng đúng hàng/ô — dangerouslyPasteHTML làm bảng rỗng.
        const delta = quill.clipboard.convert({ html: defaultValue });
        quill.updateContents(delta, "user");
        quill.setSelection(0, "silent");
        quill.history.clear();
      }
      const sync = () => {
        if (inputRef.current) {
          // Quill serialize dấu cách thành &nbsp; -> trả về dấu cách thường,
          // nếu không chữ ngoài web sẽ không xuống dòng được.
          const html = quill.getSemanticHTML().replace(/&nbsp;|&#160;/g, " ");
          inputRef.current.value = quill.getText().trim() ? html : "";
        }
      };
      quill.on("text-change", sync);
      sync();
      // Trước khi form submit: gỡ thẻ tạm của bảng rồi serialize lại,
      // nếu không nội dung bảng sẽ bị lưu rỗng.
      const form = holderRef.current?.closest("form");
      const onFormSubmit = () => {
        const tableModule = quill.getModule("table-better") as
          | { deleteTableTemporary?: () => void }
          | undefined;
        tableModule?.deleteTableTemporary?.();
        sync();
      };
      form?.addEventListener("submit", onFormSubmit);
      cleanupRef.current = () => form?.removeEventListener("submit", onFormSubmit);
      quillRef.current = quill;
    })();

    return () => {
      mounted = false;
      cleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="richtext">
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue} />
      <div ref={holderRef} style={{ minHeight }} />
    </div>
  );
}
