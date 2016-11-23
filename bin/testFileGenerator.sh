
#!/bin/bash
# This script generates some files filled with random data for test purposes

ONE_MB_FILES=10
TEN_MB_FILES=5
FIFTY_MB_FILES=1
HUNDRED_MB_FILES=1
LARGE_NUMBBER_FILES=1000

SCRIPTPATH=$( cd $(dirname $0) ; pwd -P )
BASEPATH=$SCRIPTPATH/../tests/files
SIZEPATH=$BASEPATH/sizes
VOLUMEPATH=$BASEPATH/volumes

if [ ! -d "$SIZEPATH" ]; then
  echo Creating $SIZEPATH
  mkdir -p $SIZEPATH
fi

if [ ! -d "$VOLUMEPATH" ]; then
  echo Creating $VOLUMEPATH
  mkdir -p $VOLUMEPATH
fi

rm -rf $VOLUMEPATH/*
rm -rf $SIZEPATH/*

echo Creating $ONE_MB_FILES 1Mb files
for i in $(seq -f "%05g" 1 $ONE_MB_FILES)
do
   dd if=/dev/urandom of=$SIZEPATH/0001-mb-$i.txt bs=1M count=1 > /dev/null
done

echo Creating $TEN_MB_FILES 10Mb files
for i in $(seq -f "%05g" 1 $TEN_MB_FILES)
do
   dd if=/dev/urandom of=$SIZEPATH/0010-mb-$i.txt bs=1M count=10 > /dev/null
done

echo Creating $FIFTY_MB_FILES 10Mb files
for i in $(seq -f "%05g" 1 $FIFTY_MB_FILES)
do
   dd if=/dev/urandom of=$SIZEPATH/0050-mb-$i.txt bs=1M count=50 > /dev/null
done

echo Creating $HUNDRED_MB_FILES 10Mb files
for i in $(seq -f "%05g" 1 $HUNDRED_MB_FILES)
do
   dd if=/dev/urandom of=$SIZEPATH/0100-mb-$i.txt bs=1M count=100 > /dev/null
done
