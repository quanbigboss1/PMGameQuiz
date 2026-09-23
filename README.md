# Lingua Quest

Ứng dụng học ngoại ngữ dạng game, dùng Node.js + Express + SQL Server Windows Authentication.

## Chạy nhanh

1. Cài Node.js LTS.
2. Chạy `npm install`.
3. Copy `.env.example` thành `.env`, sửa `DB_SERVER`, `DB_INSTANCE` nếu SQL Server dùng named instance.
4. Mở SQL Server Management Studio bằng tài khoản Windows của bạn và chạy `database/schema.sql`.
5. Chạy `npm run dev` rồi mở `http://localhost:3000`.

## Kiến trúc

- `server.js`: entry point.
- `src/app.js`: Express app và middleware.
- `src/config`: cấu hình SQL Server pool và Windows Authentication.
- `src/routes`: chỉ khai báo URL và nối route với controller.
- `src/controllers`: nhận request, gọi service, trả HTTP response/status code.
- `src/services`: validation, chọn user hiện tại và nghiệp vụ ứng dụng.
- `src/repositories`: chỉ truy vấn và ghi dữ liệu SQL Server.
- `src/middleware/auth.js`: đọc và xác thực JWT Bearer token.
- `public`: frontend tĩnh, không cần build.
- `database/schema.sql`: schema và dữ liệu mẫu.

### Luồng backend

`Request -> Route -> Controller -> Service -> Repository -> SQL Server`

Ví dụ endpoint hoàn thành bài học:

`POST /api/lessons/:id/progress -> learningController.saveLessonProgress -> learningService.saveLessonProgress -> learningRepository.saveLessonProgress -> UserLessonProgress`

### Account API

Public endpoints:

- `POST /api/auth/register`: tạo tài khoản trong `Users`.
- `POST /api/auth/login`: kiểm tra `PasswordHash`, cập nhật `LastLoginAt`, trả JWT.

Protected endpoints cần header `Authorization: Bearer <token>`:

- `GET /api/auth/me`: lấy profile từ `Users`.
- `PATCH /api/auth/me`: cập nhật FullName, AvatarUrl, DateOfBirth, Gender, Country, Bio.
- `PATCH /api/auth/me/password`: đổi PasswordHash.
- `GET /api/account/subscriptions`: lấy dữ liệu `Subscriptions`.
- `GET /api/account/notifications`: lấy `Notifications`; thêm `?unreadOnly=true` để lọc chưa đọc.
- `PATCH /api/account/notifications/:id/read`: đánh dấu notification đã đọc.
- `GET /api/account/vocabulary`: lấy `UserVocabulary` kết hợp `Vocabulary`; thêm `?favoritesOnly=true`.
- `PATCH /api/account/vocabulary/:id`: cập nhật `IsFavorite` hoặc `IsLearned`.

Các API learning hiện vẫn hỗ trợ `userId` query để frontend demo chạy ngay, nhưng khi gửi JWT thì user trong token luôn được ưu tiên.

### Ranked API

Chạy migration một lần trên database hiện tại:

```powershell
sqlcmd -S "LAPTOP-85H6VGJP\\XIAOSHIYI" -E -d LinguaQuest -i database/schema-ranked.sql
```

Các endpoint ranked đều cần JWT:

- `GET /api/ranked/home`: season active, rank hiện tại, tier và lịch sử trận.
- `POST /api/ranked/queue` với `{ "languageId": 1 }`: vào queue hoặc ghép với đối thủ rating gần nhau.
- `DELETE /api/ranked/queue`: hủy tìm trận.
- `GET /api/ranked/matches/:id`: lấy trận và câu hỏi.
- `POST /api/ranked/matches/:id/answers`: lưu câu trả lời vào `MatchAnswers`.
- `POST /api/ranked/matches/:id/finish`: chốt kết quả, rating, `PlayerRanks` và `RankHistory`.

Migration dùng `NO ACTION` cho FK `MatchAnswers -> MatchQuestions` để tránh lỗi multiple cascade paths của SQL Server.

Windows Authentication được bật bằng `DB_TRUSTED_CONNECTION=true`; không cần lưu username/password trong `.env`. Với named instance, đặt `DB_SERVER=COMPUTER_NAME\\INSTANCE_NAME` và để `DB_PORT` trống để SQL Browser tự tìm port. Nếu TCP/IP đang tắt, mở SQL Server Configuration Manager > SQL Server Network Configuration > Protocols for XIAOSHIYI > bật TCP/IP, sau đó restart SQL Server.
