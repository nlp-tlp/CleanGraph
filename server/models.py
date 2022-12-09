import datetime

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship

from database import Base


class Graph(Base):
    __tablename__ = "graph"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    last_updated = Column(
        DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now
    )

    triples = relationship("Triple", back_populates="graph", cascade="all,delete")
    ontology = relationship("Ontology", back_populates="graph", cascade="all,delete")
    nodes = relationship("Node", back_populates="graph", cascade="all,delete")


class Triple(Base):
    __tablename__ = "triples"

    id = Column(Integer, primary_key=True, index=True)
    subj_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    obj_id = Column(Integer, ForeignKey("nodes.id"), nullable=False)
    rel_id = Column(Integer, ForeignKey("ontology.id"), nullable=False)
    is_reviewed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    graph_id = Column(Integer, ForeignKey("graph.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    last_updated = Column(
        DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now
    )

    graph = relationship("Graph", back_populates="triples")
    subj = relationship("Node", foreign_keys=[subj_id])
    obj = relationship("Node", foreign_keys=[obj_id])
    rel = relationship("Ontology", foreign_keys=[rel_id])


class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    value = Column(
        Integer, nullable=False
    )  # Value for degree or any other suitable measure
    type_id = Column(Integer, ForeignKey("ontology.id"), nullable=False)
    graph_id = Column(Integer, ForeignKey("graph.id"), nullable=False)
    is_reviewed = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.now)
    last_updated = Column(
        DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now
    )

    graph = relationship("Graph", back_populates="nodes")
    type = relationship("Ontology", foreign_keys=[type_id])


class Ontology(Base):
    __tablename__ = "ontology"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    is_entity = Column(Boolean, nullable=False)
    color = Column(String, nullable=False)
    graph_id = Column(Integer, ForeignKey("graph.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    last_updated = Column(
        DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now
    )

    graph = relationship("Graph", back_populates="ontology")
