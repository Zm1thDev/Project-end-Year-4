import {useGoogleLogin} from '@react-oauth/google'
import { useNavigate } from 'react-router-dom';
import logo_black from '../images/logo-black.png';
import axios from 'axios';
import { useState,useEffect,useRef } from 'react';

const Loginpage = () =>{
    const navigate = useNavigate();

    const [showmodal,setShowModal] = useState(false)
    const modalRef = useRef(null);
    const triggerRef = useRef(null);


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
    const LoginSuccess = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
        try {
            const { access_token } = tokenResponse;
            const tokenRes = await axios.post(`http://localhost:8000/auth/`, { access_token });
            const { profile } = tokenRes.data;
            const email = profile.email;

            localStorage.setItem('googleUser',JSON.stringify({
                    profile,
                    access_token
                })
            );

            const sheetres = await axios.get(`http://localhost:8000/get-sheetdata/`);
            const sheetdata = sheetres.data.data;

            const userInsheets = sheetdata.find(row => row[2] === email)

            if(userInsheets){
                if (email.endsWith('@gmail.com')) {
                navigate('/teacher');
                } else if (email.endsWith('@mail.rmutk.ac.th')) {
                    navigate('/student');
                }
            }else {
                setShowModal(true)
                localStorage.removeItem('googleUser');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการรับข้อมูลผู้ใช้ Google');
        }
        },
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets',
        flow: 'implicit',
    });
    return(
        <>
         <div className='d-flex justify-content-center align-items-center min-vh-100'>
            <div className='mx-5 text-center p-5 shadow rounded-3' style={{maxWidth: '500px'}}>
                <img src={logo_black} alt="logo_login" className='w-50'/> 
                <div>
                    <h2 className='fw-bold text-uppercase'>Log in</h2>
                    <p className='text-secondary'>เข้าถึงบัญชีของคุณ</p>
                </div>
                    <button onClick={() => LoginSuccess()} className="btn btn-dark w-100"><i className="fa-brands fa-google me-3"></i>เข้าสู่ระบบด้วย Google</button>
                <div className='position-relative my-4'>
                    <hr className='text-secondary' />
                    <div className='divider text-secondary'>Or</div>
                </div>
                <div className='mt-3'>
                    <button onClick={()=> navigate('/admin-login')} className='bg-transparent btn-admin'><i className="fa-solid fa-user me-2"></i>เข้าสู่ระบบ Admin</button>
                </div>
            </div>
         </div>

         {/* modal Notification user */}
         {showmodal && (
             <div className="modal show" tabIndex="-1" aria-labelledby="notificationuserLabel" style={{ display: 'block' }} aria-modal="true" ref={modalRef}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title text-danger" id="notificationuserLabel">อีเมลไม่ได้รับอนุญาต</h5>
                            <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body">
                            อีเมลของคุณไม่ได้รับอนุญาตให้เข้าสู่ระบบ กรุณาติดต่อฝั่งผู้ดูแลระบบ
                        </div>
                    </div>
                </div>
            </div>
         )}
        </>
    )
}
export default Loginpage