import { useState , useRef , useEffect } from "react";
import { useNavigate } from "react-router-dom"

const Loginadmin = () => {
    const [username,setUsername] = useState('');
    const [password,setPassword] = useState('');
    const [showmodal,setShowModal] = useState(false)
    const [error , setError] = useState('')
    const navigate = useNavigate();

    const modalRef = useRef(null);
    const triggerRef = useRef(null);

    const Submit = (e) =>{
        const admin_user = process.env.REACT_APP_ADMIN_USER;
        const admin_pass = process.env.REACT_APP_ADMIN_PASSWORD;
        console.log(admin_user)
        e.preventDefault();
        if (username === admin_user && password === admin_pass) {
            const admindata = {
                username: 'ผู้ดูแลระบบ',
                picture: 'https://www.w3schools.com/howto/img_avatar.png'
            };
            localStorage.setItem('adminUser', JSON.stringify(admindata));
            navigate('/admin');
        } else {
            if (username !== admin_user && password !== admin_pass) {
                setError('ชื่อผู้ใช้และรหัสผ่านไม่ถูกต้อง');
            } else if (username !== admin_user) {
                setError('ชื่อผู้ใช้ไม่ถูกต้อง');
            } else if (password !== admin_pass) {
                setError('รหัสผ่านไม่ถูกต้อง');
            }
            triggerRef.current = document.activeElement;
            setShowModal(true);
        }
    }

    useEffect(() =>{
        if(showmodal){
            modalRef.current?.focus();
            document.body.classList.add("modal-open")
        }else{
            document.body.classList.remove("modal-open");
            triggerRef.current?.focus?.();
        }
        return () => document.body.classList.remove("modal-open");
    },[showmodal])
    return(
        <>
        <div className="d-flex justify-content-center align-items-center min-vh-100">
            <div className="mx-5 p-5 shadow rounded-3">
                <div className="text-center mb-4">
                    <i className="fa-solid fa-user fs-2 d-block lh-lg"></i>
                    <h2 className="fs-4">เข้าสู่ระบบ Admin</h2>
                </div>
                <form action="" onSubmit={Submit}>
                    <div className="input-field">
                        <input type="text"id="username" required value={username} onChange={(e) => setUsername(e.target.value)}/>
                        <label htmlFor="username">ชื่อผู้ใช้</label>
                    </div>
                    <br />
                    <div className="input-field">
                        <input type="password"id="password" required value={password}  onChange={(e) => setPassword(e.target.value)}/>
                        <label htmlFor="password">รหัสผ่าน</label>
                    </div>
                    <br />
                    <div className="text-center">
                        <button type="submit" className="btn-log-admin border-0 text-white px-3 py-1 rounded-3">เข้าสู่ระบบ</button>
                    </div>
                </form>
            </div>
        </div>

        {/* modal Notification admin */}
         {showmodal && (
             <div className="modal show" tabIndex={-1}  aria-labelledby="notificationadminLabel" style={{ display: 'block' }}  aria-modal="true" ref={modalRef}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title text-danger" id="notificationadminLabel"><i className="fa-solid fa-bell me-2"></i>แจ้งเตือน</h5>
                            <button type="button" className="btn-close shadow-none" aria-label="Close" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            {error}
                        </div>
                    </div>
                </div>
            </div>
         )}
        </>
    )
}

export default Loginadmin