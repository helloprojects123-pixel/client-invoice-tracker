from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from typing import List, Optional

DATABASE_URL = "sqlite:///./invoices.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class InvoiceDB(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=False)
    project_title = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="Pending")  # Paid, Pending, Overdue
    due_date = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

class InvoiceCreate(BaseModel):
    client_name: str = Field(..., min_length=2)
    project_title: str = Field(..., min_length=2)
    amount: float = Field(..., gt=0)
    status: str = Field(default="Pending")
    due_date: str

class InvoiceResponse(InvoiceCreate):
    id: int
    class Config:
        from_attributes = True

app = FastAPI(title="Client & Invoice Tracker API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Seed realistic sample data on first run
@app.on_event("startup")
def seed_data():
    db = SessionLocal()
    if db.query(InvoiceDB).count() == 0:
        samples = [
            InvoiceDB(client_name="Northstar Logistics", project_title="Operations Analytics Dashboard", amount=1850.0, status="Paid", due_date="2026-11-05"),
            InvoiceDB(client_name="GreenLeaf Retail", project_title="Inventory REST API Integration", amount=1200.0, status="Paid", due_date="2026-11-12"),
            InvoiceDB(client_name="FinBridge Advisors", project_title="Client Onboarding Portal UI", amount=2400.0, status="Pending", due_date="2026-11-28"),
            InvoiceDB(client_name="PulseHealth Clinic", project_title="Appointment Booking Backend", amount=1500.0, status="Pending", due_date="2026-12-03"),
            InvoiceDB(client_name="Apex EdTech", project_title="Student Progress Reporting Module", amount=950.0, status="Overdue", due_date="2026-11-15"),
            InvoiceDB(client_name="CloudCart Studio", project_title="Checkout Webhook Service", amount=1100.0, status="Paid", due_date="2026-11-18"),
        ]
        db.add_all(samples)
        db.commit()
    db.close()

@app.get("/api/invoices", response_model=List[InvoiceResponse])
def list_invoices(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(InvoiceDB)
    if status and status != "All":
        query = query.filter(InvoiceDB.status == status)
    return query.order_by(InvoiceDB.id.desc()).all()

@app.post("/api/invoices", response_model=InvoiceResponse, status_code=201)
def create_invoice(payload: InvoiceCreate, db: Session = Depends(get_db)):
    item = InvoiceDB(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.put("/api/invoices/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(invoice_id: int, payload: InvoiceCreate, db: Session = Depends(get_db)):
    item = db.query(InvoiceDB).filter(InvoiceDB.id == invoice_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for k, v in payload.model_dump().items():
        setattr(item, k, v)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    item = db.query(InvoiceDB).filter(InvoiceDB.id == invoice_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Invoice not found")
    db.delete(item)
    db.commit()
    return {"message": "Deleted successfully"}