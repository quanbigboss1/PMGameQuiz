# Up Lingua Quest lên host FREE

Dự án của bạn: **Node Express (`server.js` + `src/app.js`) + SQL Server (`mssql`) + Frontend tĩnh (`public/`)**.
Đã tạo sẵn `render.yaml` để deploy 1-click lên Render.

## Lựa chọn nhanh

| Nhu cầu | Host free khuyên dùng | Ghi chú |
|---|---|---|
| Demo giao diện nhanh nhất (không cần DB) | Vercel / Netlify / Cloudflare Pages / GitHub Pages | Chỉ up thư mục `public/` |
| Fullstack Node + API | **Render.com Free** (750h/tháng, tắt khi idle ~50s cold-start) | Đã có `render.yaml`, `npm start` |
| Database SQL Server free | **Azure SQL Database Free** (100k vCore-giây + 32GB/tháng, free vĩnh viễn) | Thay `DB_SERVER` bằng Azure, `DB_ENCRYPT=true` |
| Alternative nếu bỏ SQL Server | Neon.tech / Supabase Postgres free + sửa code `mssql` -> `pg` | Tốn công sửa code |

> Render/Koyeb/Fly không có SQL Server free đi kèm. Bắt buộc phải dùng DB remote (Azure) hoặc chuyển DB.

## Cách 1: Fullstack lên Render (khuyên dùng)

1. Push code lên GitHub:
   ```bash
   git add .
   git commit -m "deploy free"
   git push origin main
   ```
2. Tạo Azure SQL Free:
   - portal.azure.com -> Create SQL Database -> chọn Free tier
   - Lấy Server: `xxx.database.windows.net`, DB `LinguaQuest`, user/pass
   - Firewall: Allow Azure services + thêm IP Render (hoặc `0.0.0.0-255.255.255.255` để test)
   - Chạy 3 file `database/schema.sql`, `schema-pro.sql`, `schema-ranked.sql` bằng SSMS / Azure Query Editor
3. Lên render.com -> New -> Blueprint -> chọn repo (nó tự đọc `render.yaml`)
   Hoặc New Web Service:
   - Build: `npm install`
   - Start: `npm start`
   - Env vars:
     ```
     DB_SERVER=xxx.database.windows.net
     DB_PORT=1433
     DB_NAME=LinguaQuest
     DB_USER=...
     DB_PASSWORD=...
     DB_ENCRYPT=true
     DB_TRUST_CERT=false
     JWT_SECRET=chuoi-bi-mat-dai
     JWT_EXPIRES_IN=7d
     ```
4. Deploy -> nhận URL `https://lingua-quest.onrender.com`
   Frontend + API chung 1 URL vì `src/app.js` đã `express.static(public)`.

## Cách 2: Chỉ frontend (2 phút, không cần DB)

Vercel:
```bash
npm i -g vercel
cd public
vercel --prod
```
Hoặc kéo-thả thư mục `public/` lên netlify.com/drop, cloudflare pages.

## Lưu ý quan trọng cho dự án này

- `package.json` dùng `msnodesqlv8` (Windows-only). Trên Render Linux sẽ lỗi. Gỡ hoặc để optional:
  ```bash
  npm uninstall msnodesqlv8
  ```
  Chỉ giữ `mssql`. Kiểm tra `src/config/database.js` đang dùng driver nào.
- `server.js` đã dùng `process.env.PORT` -> OK cho host free.
- Render free ngủ sau 15p idle, lần đầu load chậm ~50s là bình thường.
- Không commit `.env` thật, chỉ dùng Env Vars trên dashboard host.
- `DB_TRUSTED_CONNECTION=true` chỉ chạy local Windows, lên host phải dùng SQL Auth (user/pass) + `ENCRYPT=true`.

## Check trước khi up

```bash
npm run check
npm start
```

Mở `http://localhost:3000` OK rồi mới push.