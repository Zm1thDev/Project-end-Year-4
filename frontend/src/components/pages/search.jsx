import { useState,useRef,useEffect } from "react"
import Footer from "./Footer"
import Navbarr from "./Navbar"
import axios from "axios"

const Search = () =>{
    const [searchquery, setSearchQuery] = useState("");
    const [searchresults, setSearchResults] = useState([])
    const [error, setError] = useState("")
    const [showmodal, setShowModal] = useState(false)
    const [tooltip, setToolTip] = useState({show:false, text:'',x:0,y:0})
    const [page, setPage] = useState(1)
    const [order, setOrder] = useState({ key: null, config: "asc" });
    const itempage = 19
    const modalRef = useRef(null);
    const triggerRef = useRef(null);

    const lastitem = page * itempage;
    const firstitem = lastitem - itempage;
    const currentitem = searchresults.slice(firstitem,lastitem)
    const tottalpage = Math.ceil(searchresults.length/itempage) || 1;

    useEffect(() =>{
        if(showmodal){
            modalRef.current?.focus();
            document.body.classList.add("modal-open")
        }else{
            document.body.classList.remove("modal-open")
            triggerRef.current?.focus()
        }
        return () => document.body.classList.remove("modal-open");
    },[showmodal])
    const searchData = async () =>{
        if(!searchquery){
            setError("กรุณากรอกคำค้นหา")
            setShowModal(true)
            return
        }
        console.log(searchquery);
        const { access_token } = JSON.parse(localStorage.getItem('googleUser'));
        try{
            const response = await axios.get(`http://localhost:8000/search/`,{
                params:{query: searchquery},
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            })
            console.log(response.data);
            if (response.data.length === 0) {
                setError("ไม่พบข้อมูลที่ตรงกับคำค้นหา");
                setShowModal(true);
                return;
            }
            setSearchResults(response.data)
        }catch(e){
            setError("ไม่มีข้อมูลหรือไม่สามารถค้นหาข้อมูลได้")
            setShowModal(true)
            console.error(e)
        }
    }
    const getall = async () => {
        const { access_token } = JSON.parse(localStorage.getItem('googleUser'));
        try {
            const response = await axios.get(`http://localhost:8000/all/`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(response.data);
            if (response.data.length === 0) {
                setError("ไม่มีข้อมูลในชีต");
                setShowModal(true);
                return;
            }
            setSearchResults(response.data);
            setSearchQuery("");
        } catch (e) {
            setError("ไม่สามารถดึงข้อมูลทั้งหมดได้");
            setShowModal(true);
            console.error(e);
        }
    };
    useEffect(() =>{
        setPage(1);
    },[searchresults.length])

    const previous = () =>{
        if(page > 1){
            setPage(prev => prev-1)
        }
    }
    const next = () =>{
        if(page < tottalpage){
            setPage(prev => prev+1)
        }
    }
    const mousehover = (e,text) =>{
        const cell = e.currentTarget;
        const overflow = cell.scrollWidth > cell.clientWidth || cell.scrollHeight > cell.clientHeight;

        if(overflow){
            const rect = cell.getBoundingClientRect();
            setToolTip({show: true,text:text,x: rect.left,y: rect.bottom})
        }
    }
    const mouseleave = () => {
        setToolTip({ show: false, text: '', x: 0, y: 0 });
    };
    const clickOrder = (index) => {
        let config = "asc";
        if (order.key === index && order.config === "asc") {
            config = "desc";
        }
        setOrder({ key: index, config });

        const orderData = [...searchresults].sort((a, b) => {
            const A = a[index] ? a[index].toString() : "";
            const B = b[index] ? b[index].toString() : "";

            if (!isNaN(A) && !isNaN(B)) {
                return config === "asc" ? A - B : B - A;
            } else {
                return config === "asc"
                    ? A.localeCompare(B, "th")
                    : B.localeCompare(A, "th");
            }
        });
        setSearchResults(orderData);
    };

    return(
        <>
        <div className="vh-100 d-flex flex-column">
            <Navbarr />
            <div className="container flex-grow-1 d-flex flex-column py-4">  
                 {/*search data  */}
              <div className="input-box">
                 <i className="fa-solid fa-magnifying-glass"></i>
                 <input type="text" placeholder="ค้นหาข้อมูล..." value={searchquery} onChange={(e) => setSearchQuery(e.target.value)}/>
                 <button className="btn-search-data" onClick={searchData}>ค้นหา</button>
                 <button className="btn-all-data" onClick={getall}>all</button>
              </div>
              <div className="d-flex flex-column flex-grow-1 mt-4">
                {/* show data */}
                <div className="show-datainput flex-grow-1 w-100 rounded-2">
                    <table className="table table-bordered table-sm" style={{ tableLayout: "fixed", width: "100%" }}>
                        <thead>
                            <tr>
                                <th className='col-title head-search' onClick={() => clickOrder(0)}>ชื่อหัวข้อ TH, ENG</th>
                                <th className='col-author head-search' onClick={() => clickOrder(1)}>ชื่อผู้จัดทำ</th>
                                <th className='col-advisor head-search'onClick={() => clickOrder(2)}>ชื่อ อ. ที่ปรึกษา</th>
                                <th className='col-year head-search'onClick={() => clickOrder(3)}>ปีการศึกษา</th>
                                <th className='col-keywords head-search'onClick={() => clickOrder(4)}>คำสำคัญ</th>
                                <th className='col-link'>ลิงก์ไปยังไฟล์</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentitem.length > 0 ? (
                                currentitem.map((data,index)=>(
                                    <tr key={index}>
                                        <td className="search-data" onMouseEnter={(e) => mousehover(e,data[0])} onMouseLeave={mouseleave}>{data[0]}</td>
                                        <td className="search-data" onMouseEnter={(e) => mousehover(e,data[1])} onMouseLeave={mouseleave}>{data[1]}</td>
                                        <td className="search-data" onMouseEnter={(e) => mousehover(e,data[2])} onMouseLeave={mouseleave}>{data[2]}</td>
                                        <td className="search-data" onMouseEnter={(e) => mousehover(e,data[3])} onMouseLeave={mouseleave}>{data[3]}</td>
                                        <td className="search-data" onMouseEnter={(e) => mousehover(e,data[4])} onMouseLeave={mouseleave}>{data[4]}</td>
                                        <td className="search-data" ><a href={data[5]} target="_blank" rel="noopener noreferrer">link</a></td>
                                    </tr>
                                ))
                            ):null}
                        </tbody>
                    </table>  
                </div>
                <div className="mt-4 d-flex justify-content-center align-items-center gap-2">
                    <button className="btn btn-dark btn-sm" onClick={previous} disabled={page === 1}><i className="fa-solid fa-backward"></i></button>
                    <span className="mx-2">{page} / {tottalpage}</span>
                    <button className="btn btn-dark btn-sm" onClick={next} disabled={page === tottalpage}><i className="fa-solid fa-forward"></i></button>
                </div>
              </div>
            </div>
            <Footer />
        </div>
        {/* tooltip */}
            {tooltip.show && (
                <div className='hover-tooltip' style={{left:`${tooltip.x}px`,top:`${tooltip.y}px`}}>
                    {tooltip.text}
                </div>
            )}
        {/* modal Notification search */}
        {showmodal && (
            <div className="modal show" tabIndex="-1" aria-labelledby="notificationsearchLabel" style={{ display: 'block' }} aria-modal="true" ref={modalRef}>
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title text-danger" id="notificationsearchLabel"><i className="fa-solid fa-bell me-2"></i>แจ้งเตือน</h5>
                        <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" onClick={(e) => setShowModal(false)}></button>
                    </div>
                    <div className="modal-body">
                        <p className='m-0'>{error}</p>
                    </div>
                </div>
            </div>
        </div>
        )}
        </>
    )
}
export default Search