import { useState, useEffect } from 'react';
import logo_white from '../../images/logo-white.png';
import axios from 'axios';

const Navbarr = () => {
  const googleuser = JSON.parse(localStorage.getItem('googleUser'));
  const adminuser = JSON.parse(localStorage.getItem('adminUser'));

  const isgoogle_user = !!googleuser;
  const isadmin_user = !!adminuser;

  const googleProfile = googleuser?.profile;
  const googlePicture = googleProfile?.picture;
  const googleEmail = googleProfile?.email;

  const [userdata, setUserData] = useState(null);

  useEffect(() => {
    if (isgoogle_user && googleEmail) {
      const fetchuserdata = async () => {
        try {
          const response = await axios.get(`http://localhost:8000/get-userdata/${googleEmail}`);
          setUserData(response.data.user);
        } catch (err) {
          console.error('เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้ : ', err);
        }
      };
      fetchuserdata();
    }
  }, [googleEmail, isgoogle_user,]);

  useEffect(() => {
    const onHide = () => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    const id = ['showdata', 'logout'];
    id.forEach((id) => {
      const el = document.getElementById(id);
      el?.addEventListener('hide.bs.modal', onHide);
    });
    return () => {
      id.forEach((id) => {
        const el = document.getElementById(id);
        el?.removeEventListener('hide.bs.modal', onHide);
      });
    };
  }, []);

  return (
    <>
      <nav className="navbar" style={{ backgroundColor: '#21a833' }}>
        <div className="container d-flex justify-content-between align-items-center">
          <div className="navbar-brand m-0">
            <img src={logo_white} alt="logo_page" className="logo-nav" />
          </div>
          <ul className="navbar-nav d-flex flex-row ms-auto">
            {(isgoogle_user || isadmin_user) && (
              <>
                <li className="nav-item dropdown position-relative d-flex align-items-center gap-3">
                  <p className="m-0  text-white">
                    {isgoogle_user ? googleEmail : adminuser.username}
                  </p>
                  <button className="nav-link dropdown-toggle text-white" data-bs-toggle="dropdown" aria-expanded="false">
                    <img
                      src={isgoogle_user ? googlePicture : adminuser.picture}
                      alt="picture-user"
                      className="img-user"
                      onError={(e) => {
                        e.target.onError = null;
                        e.target.src = 'https://www.w3schools.com/howto/img_avatar.png';
                      }}
                    />
                  </button>
                  <ul className="dropdown-menu position-absolute dropdown-menu-end">
                    <li>
                      <button className="dropdown-item" data-bs-toggle="modal" data-bs-target="#showdata"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f0f0f0';
                          e.target.style.color = '#40414a';
                        }}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                      >
                        ข้อมูลบัญชีผู้ใช้งาน
                      </button>
                    </li>
                    <li>
                      <button
                        className="dropdown-item" data-bs-toggle="modal" data-bs-target="#logout"
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#f0f0f0';
                          e.target.style.color = '#40414a';
                        }}
                        onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
                      >
                        ออกจากระบบ
                      </button>
                    </li>
                  </ul>
                </li>
              </>
            )}
          </ul>
        </div>
      </nav>

      {/* modal showdata */}
      <div className="modal fade" id="showdata" tabIndex={-1} aria-labelledby="showdataLabel" aria-hidden="true" data-bs-focus="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header">
              <h5 className="modal-title" id="showdataLabel">
                ข้อมูลบัญชีผู้ใช้งาน
              </h5>
              <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {(isgoogle_user || isadmin_user) && (
                <>
                  {isgoogle_user && (
                    <div className="m-2">
                      <div className="d-flex justify-content-center mb-4">
                        <img
                          src={googlePicture}
                          alt="picture-user"
                          className="img-user-modal"
                          onError={(e) => {
                            e.target.onError = null;
                            e.target.src = 'https://www.w3schools.com/howto/img_avatar.png';
                          }}
                        />
                      </div>
                      {userdata && (
                        <>
                          <div className="w-100 d-flex justify-content-center">
                            <div className="ms-5 fw-bold">
                              <p className="mb-1">รหัส : </p>
                              <p className="mb-1">ชื่อ-นามสกุล : </p>
                              <p className="mb-1">อีเมล : </p>
                              <p className="mb-1">ประเภท : </p>
                              <p>สาขา : </p>
                            </div>
                            <div className="ms-3">
                              <p className="mb-1">{userdata[0]}</p>
                              <p className="mb-1">{userdata[1]}</p>
                              <p className="mb-1">{userdata[2]}</p>
                              <p className="mb-1">{userdata[3]}</p>
                              <p>{userdata[4]}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {isadmin_user && (
                    <div className="mb-2 text-center">
                      <img
                        src={adminuser.picture}
                        alt="picture-user"
                        className="img-user-modal"
                        onError={(e) => {
                          e.target.onError = null;
                          e.target.src = 'https://www.w3schools.com/howto/img_avatar.png';
                        }}
                      />
                      <h5 className="mt-3">{adminuser.username}</h5>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* modal logout */}
      <div className="modal fade" id="logout" tabIndex={-1} aria-labelledby="logoutLabel" aria-hidden="true" data-bs-focus="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <div className="modal-header">
              <h5 className="modal-title" id="logoutLabel">
                ยืนยันการออกจากระบบ
              </h5>
              <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">คุณต้องการออกจากระบบใช่หรือไม่ ?</div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                ยกเลิก
              </button>
              <button type="button" className="btn btn-danger"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Navbarr;
