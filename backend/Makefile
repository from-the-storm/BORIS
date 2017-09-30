lint:
	pep8 boris
	pylint boris
test_python:
	BORIS_ENV=test ./manage.py test
test: lint test_python
