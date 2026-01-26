import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as bootstrap from "bootstrap";
import "./index.css";
//從環境變數取得 API 資訊
const API_BASE = import.meta.env.VITE_API_BASE;
const API_PATH = import.meta.env.VITE_API_PATH;
//定義全空白的產品資料常數，方便重用
const defaultProductState = {
  title: "",
  category: "",
  origin_price: 0,
  price: 0,
  unit: "",
  description: "",
  content: "",
  is_enabled: 0,
  imageUrl: "",
  imagesUrl: [], // 副圖陣列
};

function App() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [isAuth, setIsAuth] = useState(false);
  const [products, setProducts] = useState([]);

  // 狀態管理：目前操作的產品資料與 Modal 類型
  const [tempProduct, setTempProduct] = useState(defaultProductState);
  const [modalType, setModalType] = useState("");

  const productModalRef = useRef(null); // 指向 Modal DOM
  const modalInstanceRef = useRef(null); // 存放 Bootstrap Modal 實例

  useEffect(() => {
    // 1. 從 Cookie 取出 Token 並設定 axios
    const token = document.cookie.replace(
      /(?:(?:^|.*;\s*)hexToken\s*=\s*([^;]*).*$)|^.*$/,
      "$1",
    );
    if (token) {
      axios.defaults.headers.common.Authorization = token;
      checkAdmin();
    }

    // 2. 初始化 Bootstrap Modal 實例
    modalInstanceRef.current = new bootstrap.Modal(productModalRef.current, {
      keyboard: false,
      backdrop: "static", // 點擊背景不關閉，防止資料遺失
    });
  }, []);

  // 驗證登入
  const checkAdmin = async () => {
    try {
      await axios.post(`${API_BASE}/api/user/check`);
      setIsAuth(true);
      getProducts();
    } catch (err) {
      console.log(err.response.data.message);
      setIsAuth(false);
    }
  };

  //取得產品列表
  const getProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/${API_PATH}/admin/products`);
      setProducts(res.data.products);
    } catch (error) {
      alert("取得產品失敗");
    }
  };

  // 處理登入輸入
  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [id]: value }));
  };

  //執行登入
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE}/admin/signin`, formData);
      const { token, expired } = response.data;
      document.cookie = `hexToken=${token};expires=${new Date(expired)};`;
      axios.defaults.headers.common.Authorization = token;
      setIsAuth(true);
      getProducts();
    } catch (error) {
      alert("登入失敗");
    }
  };
  //Modal 操作邏輯
  //開啟 Modal(判斷是新增or編輯)
  const openModal = (type, product = defaultProductState) => {
    setModalType(type);
    // 確保編輯時若沒有 imagesUrl，也會給予空陣列避免報錯
    setTempProduct({
      ...product,
      imagesUrl: product.imagesUrl ? [...product.imagesUrl] : [],
    });
    modalInstanceRef.current.show();
  };

  //處理Modal內輸入框變動
  const handleModalInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setTempProduct((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  };

  //副圖管理邏輯
  const handleImageChange = (index, value) => {
    const newImages = [...tempProduct.imagesUrl];
    newImages[index] = value;
    setTempProduct({ ...tempProduct, imagesUrl: newImages });
  };

  const addImage = () => {
    setTempProduct({
      ...tempProduct,
      imagesUrl: [...tempProduct.imagesUrl, ""],
    });
  };

  const removeImage = () => {
    const newImages = [...tempProduct.imagesUrl];
    newImages.pop();
    setTempProduct({ ...tempProduct, imagesUrl: newImages });
  };

  //儲存產品(新增或編輯)
  const updateProduct = async () => {
    let api = `${API_BASE}/api/${API_PATH}/admin/product`;
    let method = "post";

    // 如果 tempProduct 有 id，代表是「編輯」
    if (tempProduct.id) {
      api = `${API_BASE}/api/${API_PATH}/admin/product/${tempProduct.id}`;
      method = "put";
    }

    try {
      const res = await axios[method](api, {
        data: {
          ...tempProduct,
          origin_price: Number(tempProduct.origin_price),
          price: Number(tempProduct.price),
        },
      });
      if (modalInstanceRef.current) {
        modalInstanceRef.current.hide();
      }

      alert(res.data.message);
      getProducts();
    } catch (error) {
      alert(error.response?.data?.message || "更新失敗");
    }
  };

  //刪除產品
  // 刪除產品
  const deleteProduct = async () => {
    // 移除參數 id
    const { id } = tempProduct; // 直接從 state 取得目前的 ID

    if (!id) {
      alert("找不到產品 ID");
      return;
    }

    if (window.confirm("確定要刪除此產品嗎?")) {
      try {
        const res = await axios.delete(
          `${API_BASE}/api/${API_PATH}/admin/product/${id}`,
        );
        alert(res.data.message);

        // 成功後關閉 Modal 並重新取得列表
        modalInstanceRef.current.hide();
        getProducts();
      } catch (error) {
        alert(error.response?.data?.message || "刪除失敗");
      }
    }
  };

  return (
    <>
      {isAuth ? (
        <div>
          <div className="container">
            <div className="text-end mt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => openModal()}
              >
                建立新的產品
              </button>
            </div>
            <table className="table mt-4">
              <thead>
                <tr>
                  <th width="120">分類</th>
                  <th>產品名稱</th>
                  <th width="120">原價</th>
                  <th width="120">售價</th>
                  <th width="100">是否啟用</th>
                  <th width="120">編輯</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.id}>
                    <td>{item.category}</td>
                    <td>{item.title}</td>
                    <td className="text-end">{item.origin_price}</td>
                    <td className="text-end">{item.price}</td>
                    <td>
                      {item.is_enabled ? (
                        <span className="text-success">啟用</span>
                      ) : (
                        <span className="text-danger">未啟用</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => openModal("edit", item)}
                        >
                          編輯
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => openModal("delete", item)}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="container login">
          <div className="row justify-content-center">
            <h1 className="h3 mb-3 font-weight-normal">請先登入</h1>
            <div className="col-8">
              <form id="form" className="form-signin" onSubmit={handleSubmit}>
                <div className="form-floating mb-3">
                  <input
                    type="email"
                    className="form-control"
                    id="username"
                    placeholder="name@example.com"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    autoFocus
                  />
                  <label htmlFor="username">Email address</label>
                </div>
                <div className="form-floating">
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                  <label htmlFor="password">Password</label>
                </div>
                <button
                  className="btn btn-lg btn-primary w-100 mt-3"
                  type="submit"
                >
                  登入
                </button>
              </form>
            </div>
          </div>
          <p className="mt-5 mb-3 text-muted">&copy; 2024~∞ - 六角學院</p>
        </div>
      )}
      <div
        id="productModal"
        ref={productModalRef}
        className="modal fade"
        tabIndex="-1"
        aria-labelledby="productModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-xl">
          <div className="modal-content border-0">
            <div className="modal-header bg-dark text-white">
              <h5 className="modal-title">
                <span>{tempProduct.id ? "編輯產品" : "新增產品"}</span>
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => modalInstanceRef.current.hide()}
              ></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-sm-4">
                  <div className="mb-3">
                    <label htmlFor="imageUrl" className="form-label">
                      輸入圖片網址
                    </label>
                    <input
                      id="imageUrl"
                      type="url"
                      className="form-control"
                      placeholder="請輸入圖片連結"
                      value={tempProduct.imageUrl}
                      onChange={handleModalInputChange}
                    />
                  </div>
                  {tempProduct.imageUrl ? (
                    <img
                      className="img-fluid"
                      src={tempProduct.imageUrl}
                      alt={tempProduct.title}
                    />
                  ) : (
                    <div className="bg-light text-center py-5 text-muted">
                      無圖片
                    </div>
                  )}
                  {/* 副圖區 */}
                  <h6>副圖設定</h6>
                  {tempProduct.imagesUrl.map((img, index) => (
                    <div key={index} className="mb-2">
                      <input
                        type="url"
                        className="form-control mb-1"
                        placeholder={`副圖 ${index + 1}`}
                        value={img}
                        onChange={(e) =>
                          handleImageChange(index, e.target.value)
                        }
                      />
                      {img && (
                        <img
                          src={img}
                          className="img-fluid mb-2"
                          alt={`副圖 ${index + 1}`}
                        />
                      )}
                    </div>
                  ))}

                  <div className="d-flex justify-content-between">
                    {tempProduct.imagesUrl.length < 5 && (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm w-100 me-2"
                        onClick={addImage}
                      >
                        新增副圖
                      </button>
                    )}
                    {tempProduct.imagesUrl.length > 0 && (
                      <button
                        className="btn btn-outline-danger btn-sm w-100"
                        onClick={removeImage}
                      >
                        刪除最後一張
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-sm-8">
                  <div className="mb-3">
                    <label htmlFor="title" className="form-label">
                      標題
                    </label>
                    <input
                      id="title"
                      type="text"
                      className="form-control"
                      placeholder="請輸入標題"
                      value={tempProduct.title}
                      onChange={handleModalInputChange}
                    />
                  </div>

                  <div className="row">
                    <div className="mb-3 col-md-6">
                      <label htmlFor="category" className="form-label">
                        分類
                      </label>
                      <input
                        id="category"
                        type="text"
                        className="form-control"
                        placeholder="請輸入分類"
                        value={tempProduct.category}
                        onChange={handleModalInputChange}
                      />
                    </div>
                    <div className="mb-3 col-md-6">
                      <label htmlFor="unit" className="form-label">
                        單位
                      </label>
                      <input
                        id="unit"
                        type="text"
                        className="form-control"
                        placeholder="請輸入單位"
                        value={tempProduct.unit}
                        onChange={handleModalInputChange}
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="mb-3 col-md-6">
                      <label htmlFor="origin_price" className="form-label">
                        原價
                      </label>
                      <input
                        id="origin_price"
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="請輸入原價"
                        value={tempProduct.origin_price}
                        onChange={handleModalInputChange}
                      />
                    </div>
                    <div className="mb-3 col-md-6">
                      <label htmlFor="price" className="form-label">
                        售價
                      </label>
                      <input
                        id="price"
                        type="number"
                        min="0"
                        className="form-control"
                        placeholder="請輸入售價"
                        value={tempProduct.price}
                        onChange={handleModalInputChange}
                      />
                    </div>
                  </div>
                  <hr />

                  <div className="mb-3">
                    <label htmlFor="description" className="form-label">
                      產品描述
                    </label>
                    <textarea
                      id="description"
                      className="form-control"
                      placeholder="請輸入產品描述"
                      value={tempProduct.description}
                      onChange={handleModalInputChange}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="content" className="form-label">
                      說明內容
                    </label>
                    <textarea
                      id="content"
                      className="form-control"
                      placeholder="請輸入說明內容"
                      value={tempProduct.content}
                      onChange={handleModalInputChange}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        id="is_enabled"
                        className="form-check-input"
                        type="checkbox"
                        checked={!!tempProduct.is_enabled}
                        onChange={handleModalInputChange}
                      />
                      <label className="form-check-label" htmlFor="is_enabled">
                        是否啟用
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => modalInstanceRef.current.hide()}
              >
                取消
              </button>
              {modalType === "delete" ? (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={deleteProduct} // 改成這樣，不需要傳入 item.id
                >
                  確認刪除
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={updateProduct}
                >
                  確認儲存
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
