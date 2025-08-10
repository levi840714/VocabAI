export default function TestApp() {
  return (
    <div>
      <h1>CSS 測試頁面</h1>
      
      <div className="test-class">
        這個 div 使用 CSS class，應該是藍色背景白色文字
      </div>
      
      <div className="bg-green-500 text-white p-4 mt-4">
        這個 div 使用 Tailwind classes，應該是綠色背景
      </div>
      
      <p>如果 body 背景是紅色，說明 CSS 文件載入正常</p>
      <p>如果第一個框是藍色，說明 CSS class 生效</p>
      <p>如果第二個框是綠色，說明 Tailwind CSS 生效</p>
    </div>
  )
}