from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base para schemas que se construyen desde objetos ORM."""

    model_config = ConfigDict(from_attributes=True)
